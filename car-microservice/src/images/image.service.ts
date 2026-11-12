import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { SourceClientService } from '../source/source-client.service';
import { NormalisedImage } from '../ingestion/normalizer';

export interface StoredImage extends NormalisedImage {
  cloudinaryPublicId: string;
  secureUrl: string;
}

/**
 * What a previous run left on the vehicle record. The persisted schema allows
 * the Cloudinary fields to be absent - an image whose upload failed is stored
 * with the source URL only - so they are optional here and narrowed below.
 */
export type PreviouslyStoredImage = NormalisedImage & {
  cloudinaryPublicId?: string;
  secureUrl?: string;
};

@Injectable()
export class ImageService {
  private readonly log = new Logger(ImageService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly source: SourceClientService,
  ) {
    cloudinary.config({
      cloud_name: this.config.get('CLOUDINARY_CLOUD_NAME'),
      api_key: this.config.get('CLOUDINARY_API_KEY'),
      api_secret: this.config.get('CLOUDINARY_API_SECRET'),
      secure: true,
    });
  }

  /**
   * Brings one vehicle's images in line with what the source currently lists.
   *
   * Uploads are matched by sourceUrl, so an image already in Cloudinary is
   * reused rather than re-fetched, while anything missing is fetched now.
   * That covers the two cases a blanket "reuse whatever we have" strands:
   * a first upload that failed, leaving the car with no photos at all, and
   * photos the seller added after we first saw the listing.
   *
   * Images live in a folder named after the vehicle's sourceId, with the
   * public_id carrying both the sourceId and the position. Even if a record
   * were corrupted later, the asset path itself says which car it belongs to.
   */
  async syncForVehicle(
    sourceId: string,
    images: NormalisedImage[],
    alreadyStored: PreviouslyStoredImage[] = [],
  ): Promise<StoredImage[]> {
    const root = this.config.get('CLOUDINARY_ROOT_FOLDER') ?? 'ckauto';
    const folder = `${root}/${sourceId}`;

    // Only reuse an upload that belongs to this vehicle. If a record were ever
    // corrupted, this stops another car's photo being carried across into it.
    const byUrl = new Map<string, StoredImage>(
      alreadyStored
        .filter(
          (img): img is StoredImage =>
            img.sourceId === sourceId && !!img.cloudinaryPublicId && !!img.secureUrl,
        )
        .map((img) => [img.sourceUrl, img] as const),
    );

    const stored: StoredImage[] = [];
    let uploaded = 0;

    for (const img of images) {
      if (img.sourceId !== sourceId) {
        // Should be impossible - the normaliser stamps these. Loud if it happens.
        throw new Error(`Image sourceId ${img.sourceId} does not match vehicle ${sourceId}`);
      }

      const reusable = byUrl.get(img.sourceUrl);
      if (reusable) {
        // Keep the existing asset; take the current position from the source.
        stored.push({ ...reusable, order: img.order });
        continue;
      }

      try {
        const bytes = await this.source.fetchImage(img.sourceUrl);
        const result = await new Promise<any>((resolve, reject) => {
          cloudinary.uploader
            .upload_stream(
              {
                folder,
                public_id: `${sourceId}_${String(img.order).padStart(2, '0')}`,
                overwrite: false,
                resource_type: 'image',
                context: { source_id: sourceId, source_url: img.sourceUrl },
              },
              (err, res) => (err ? reject(err) : resolve(res)),
            )
            .end(bytes);
        });

        stored.push({
          ...img,
          cloudinaryPublicId: result.public_id,
          secureUrl: result.secure_url,
        });
        uploaded++;
      } catch (err) {
        this.log.error(`Image ${img.order} for ${sourceId} failed: ${(err as Error).message}`);
      }
    }

    const failed = images.length - stored.length;
    if (uploaded || failed) {
      this.log.log(
        `${sourceId}: ${stored.length}/${images.length} images stored` +
          ` (${uploaded} newly uploaded${failed ? `, ${failed} failed` : ''})`,
      );
    }

    return stored;
  }
}
