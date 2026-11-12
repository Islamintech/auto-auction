import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RawListing, RawListingDocument } from '../schemas/raw-listing.schema';
import { Vehicle, VehicleDocument, VehicleStatus } from '../schemas/vehicle.schema';
import { SourceClientService } from '../source/source-client.service';
import { ImageService } from '../images/image.service';
import { RunSummary, TelegramService } from '../notify/telegram.service';
import { normalise, NormalisedVehicle, sanitise } from './normalizer';

@Injectable()
export class IngestionService {
  private readonly log = new Logger(IngestionService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly source: SourceClientService,
    private readonly images: ImageService,
    private readonly telegram: TelegramService,
    @InjectModel(RawListing.name) private readonly rawModel: Model<RawListingDocument>,
    @InjectModel(Vehicle.name) private readonly vehicleModel: Model<VehicleDocument>,
  ) {}

  /** CKAuto statuses that enter the review queue. Default: live lots only (공매진행). */
  private get ingestStatuses(): Set<string> {
    const v = this.config.get<string>('INGEST_STATUSES') ?? '공매진행';
    return new Set(v.split(',').map((s) => s.trim()).filter(Boolean));
  }

  /** Lots have up to 138 photos; the catalogue needs a handful. */
  private get maxImages(): number {
    return Math.max(1, Number(this.config.get('MAX_IMAGES_PER_VEHICLE') ?? 20));
  }

  /**
   * Whether every image the source lists for this vehicle is already stored
   * with a usable Cloudinary asset. Used to decide if an unchanged payload can
   * safely be skipped.
   */
  private imagesComplete(existing: VehicleDocument, candidate: NormalisedVehicle): boolean {
    const usable = existing.images.filter(
      (img) => img.sourceId === existing.sourceId && img.cloudinaryPublicId && img.secureUrl,
    ).length;
    return usable >= candidate.images.length;
  }

  /**
   * Stage 1 snapshot, 2 store raw, 3 diff, 4 normalise + images.
   *
   * CKAuto has no pagination or incremental filter: every run downloads the
   * whole ~18 MB snapshot. It is streamed and filtered down to the rows we
   * care about - lots in INGEST_STATUSES, plus anything we already track so a
   * reviewed car's status (e.g. auction ended) stays current - and only then
   * processed. Processing holds no connection open, so an hour of polite image
   * uploads cannot time out the download.
   */
  async run(): Promise<RunSummary> {
    const startedAt = new Date();
    const summary: RunSummary = { newCount: 0, updatedCount: 0, failedCount: 0, samples: [] };
    const statuses = this.ingestStatuses;
    const origin = this.config.get<string>('SOURCE_BASE_URL') ?? 'https://ckauto.co.kr';

    const known = new Set<string>(
      (await this.vehicleModel.find({}, { sourceId: 1, _id: 0 }).lean()).map((v) => v.sourceId),
    );

    const selected: Record<string, unknown>[] = [];
    let total = 0;
    for await (const raw of this.source.iterateListings()) {
      total++;
      const code = String(raw.code ?? '');
      if (statuses.has(String(raw.status ?? '')) || known.has(code)) selected.push(sanitise(raw));
    }
    this.log.log(`Snapshot: ${total} vehicles, ${selected.length} selected for processing`);

    for (const raw of selected) {
      let sourceId = '(unknown)';
      try {
        const candidate = normalise(raw, origin);
        sourceId = candidate.sourceId;
        candidate.images = candidate.images.slice(0, this.maxImages);

        // Stage 2: keep the original (minus stripped PII), always.
        await this.rawModel.updateOne(
          { sourceId: candidate.sourceId, payloadHash: candidate.payloadHash },
          { $setOnInsert: { payload: raw, fetchedAt: startedAt } },
          { upsert: true },
        );

        // Stage 3: have we already processed this exact payload, and did that
        // processing actually finish? A listing whose images failed to upload
        // keeps the same hash for ever, so testing the hash alone would leave
        // it without photos permanently.
        const existing = await this.vehicleModel.findOne({ sourceId: candidate.sourceId });
        if (existing && existing.payloadHash === candidate.payloadHash && this.imagesComplete(existing, candidate)) {
          await this.vehicleModel.updateOne(
            { sourceId: candidate.sourceId },
            { $set: { lastSeenAt: startedAt } },
          );
          continue;
        }

        // Stage 4: only now do we spend bandwidth on images. Images already
        // in Cloudinary are reused by URL; only genuinely new ones are fetched,
        // so a car whose first upload failed is not stranded without photos.
        // Rejected cars are kept current but get no new uploads.
        const stored =
          existing?.status === VehicleStatus.REJECTED
            ? existing.images
            : await this.images.syncForVehicle(candidate.sourceId, candidate.images, existing?.images ?? []);

        // A vehicle that failed on an earlier run and went through cleanly now
        // goes back into the review queue; otherwise it would stay FAILED for good.
        const recovered = existing?.status === VehicleStatus.FAILED;

        await this.vehicleModel.updateOne(
          { sourceId: candidate.sourceId },
          {
            $set: {
              ...candidate,
              images: stored,
              lastSeenAt: startedAt,
              ...(recovered ? { status: VehicleStatus.PENDING } : {}),
            },
            $unset: { lastError: '' },
            $setOnInsert: {
              firstSeenAt: startedAt,
              ...(recovered ? {} : { status: VehicleStatus.PENDING }),
            },
          },
          { upsert: true },
        );

        if (existing) {
          summary.updatedCount++;
        } else {
          summary.newCount++;
          const label = [candidate.year, candidate.make, candidate.model]
            .filter(Boolean)
            .join(' ') || candidate.sourceId;
          summary.samples.push({ sourceId: candidate.sourceId, label });
        }
      } catch (err) {
        summary.failedCount++;
        this.log.error(`Listing ${sourceId} failed: ${(err as Error).message}`);
        if (sourceId !== '(unknown)') {
          const lastError = (err as Error).message;
          // Record the error on every vehicle, but only move unreviewed ones to
          // FAILED. An approved car is already in the catalogue and a rejected
          // one was a decision; a bad fetch today should not undo either.
          await this.vehicleModel
            .updateOne(
              { sourceId, status: { $in: [VehicleStatus.PENDING, VehicleStatus.FAILED] } },
              { $set: { status: VehicleStatus.FAILED, lastError } },
            )
            .catch(() => undefined);
          await this.vehicleModel
            .updateOne(
              { sourceId, status: { $in: [VehicleStatus.APPROVED, VehicleStatus.REJECTED] } },
              { $set: { lastError } },
            )
            .catch(() => undefined);
        }
      }
    }

    this.log.log(
      `Run complete - new ${summary.newCount}, updated ${summary.updatedCount}, failed ${summary.failedCount}`,
    );
    await this.telegram.notifyRun(summary);
    return summary;
  }
}
