import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RawListing, RawListingDocument } from '../schemas/raw-listing.schema';
import { Vehicle, VehicleDocument, VehicleStatus } from '../schemas/vehicle.schema';
import { SourceClientService } from '../source/source-client.service';
import { ImageService } from '../images/image.service';
import { normalise, NormalisedVehicle, sanitise } from './normalizer';

/** The code is not in CKAuto's current dataset (typo, or the lot was removed). */
export class ListingNotFoundError extends Error {}

/**
 * Imports one CKAuto lot on request (from the Telegram bot).
 *
 * There used to be a daily job that pulled and processed every lot; it was
 * dropped on 2026-11-19 because it cost hours and thousands of photo uploads
 * for cars nobody had chosen. Now an admin picks each car.
 */
@Injectable()
export class IngestionService {
  private readonly log = new Logger(IngestionService.name);
  /** One import at a time: they share CKAuto's session and each streams the whole snapshot. */
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly config: ConfigService,
    private readonly source: SourceClientService,
    private readonly images: ImageService,
    @InjectModel(RawListing.name) private readonly rawModel: Model<RawListingDocument>,
    @InjectModel(Vehicle.name) private readonly vehicleModel: Model<VehicleDocument>,
  ) {}

  /** Lots have up to 138 photos; the catalogue needs a handful. */
  private get maxImages(): number {
    return Math.max(1, Number(this.config.get('MAX_IMAGES_PER_VEHICLE') ?? 20));
  }

  /**
   * Finds `code` in CKAuto's dataset, stores it and copies its photos to
   * Cloudinary. Returns the stored vehicle.
   *
   * CKAuto has no per-lot endpoint: the only way to read one lot is to stream
   * the full ~18 MB snapshot. The stream is stopped as soon as the lot is found.
   */
  importOne(code: string): Promise<VehicleDocument> {
    const run = this.queue.then(() => this.doImport(code));
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async doImport(code: string): Promise<VehicleDocument> {
    const startedAt = new Date();
    const origin = this.config.get<string>('SOURCE_BASE_URL') ?? 'https://ckauto.co.kr';

    let raw: Record<string, unknown> | undefined;
    for await (const listing of this.source.iterateListings()) {
      if (String(listing.code ?? '').toUpperCase() === code) {
        raw = sanitise(listing);
        break; // ends the generator, which closes the download
      }
    }
    if (!raw) throw new ListingNotFoundError(`Lot ${code} is not on CKAuto`);

    const candidate: NormalisedVehicle = normalise(raw, origin);
    candidate.images = candidate.images.slice(0, this.maxImages);

    // Keep the original (minus stripped PII), always.
    await this.rawModel.updateOne(
      { sourceId: candidate.sourceId, payloadHash: candidate.payloadHash },
      { $setOnInsert: { payload: raw, fetchedAt: startedAt } },
      { upsert: true },
    );

    // Photos already in Cloudinary are reused by URL; only new ones are fetched.
    const existing = await this.vehicleModel.findOne({ sourceId: candidate.sourceId });
    const stored = await this.images.syncForVehicle(candidate.sourceId, candidate.images, existing?.images ?? []);

    // An admin asking for a car again reopens it, unless it is already published.
    const reopen = existing && existing.status !== VehicleStatus.APPROVED;

    const vehicle = await this.vehicleModel.findOneAndUpdate(
      { sourceId: candidate.sourceId },
      {
        $set: {
          ...candidate,
          images: stored,
          lastSeenAt: startedAt,
          ...(reopen ? { status: VehicleStatus.PENDING } : {}),
        },
        $unset: { lastError: '' },
        $setOnInsert: { firstSeenAt: startedAt, ...(existing ? {} : { status: VehicleStatus.PENDING }) },
      },
      { upsert: true, new: true },
    );
    this.log.log(`Imported ${code}: ${stored.length}/${candidate.images.length} photos`);
    return vehicle!;
  }
}
