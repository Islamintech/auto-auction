import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type VehicleDocument = HydratedDocument<Vehicle>;

export enum VehicleStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  FAILED = 'failed',
}

/**
 * One image. It carries its own sourceId, so an image can never drift onto
 * another vehicle: it is never held in a bare array that gets zipped by
 * index against something else.
 */
@Schema({ _id: false })
export class VehicleImage {
  @Prop({ required: true })
  sourceId: string;

  @Prop({ required: true })
  sourceUrl: string;

  @Prop()
  cloudinaryPublicId?: string;

  @Prop()
  secureUrl?: string;

  /** Position as given by the source, kept explicitly rather than implied. */
  @Prop({ required: true })
  order: number;
}

export const VehicleImageSchema = SchemaFactory.createForClass(VehicleImage);

@Schema({ timestamps: true, collection: 'vehicles' })
export class Vehicle {
  @Prop({ required: true, unique: true, index: true })
  sourceId: string;

  @Prop({ required: true })
  payloadHash: string;

  // --- normalised from CKAuto (see docs/ckauto-api.md and normalizer.ts) ---
  /** LIVE (공매진행) / PENDING_AWARD (낙찰대기) / AWARDED (낙찰). Their status, not our review status. */
  @Prop({ index: true }) sourceStatus?: string;
  @Prop() insurer?: string;
  @Prop() make?: string;
  @Prop() model?: string;
  @Prop() modelName?: string;
  @Prop() trim?: string;
  @Prop() year?: number;
  @Prop() month?: number;
  @Prop() location?: string;
  /** SCRAP, TRANSFER, ... or UNKNOWN when the source value was junk. */
  @Prop() disposalType?: string;
  /** TOTAL_LOSS, PARTIAL_LOSS, FLOOD or UNKNOWN. */
  @Prop() damageType?: string;
  @Prop() fuelType?: string;
  @Prop() transmission?: string;
  @Prop() mileageKm?: number;
  @Prop() engineCode?: string;
  @Prop() displacementCc?: number;
  @Prop() inspectionDate?: Date;
  @Prop() auctionEndsAt?: Date;
  @Prop() listedAt?: Date;
  // Partner-account terms. Internal only - never sent to the catalogue.
  @Prop() commissionRate?: number;
  @Prop() costKrw?: number;
  @Prop() documentFeeKrw?: number;
  @Prop() documentFeeFor?: string;
  @Prop() currentBidKrw?: number;
  @Prop() lastBidAt?: Date;
  /** CKAuto memo: first registration date, damage notes. Free text. */
  @Prop() notes?: string;
  /** Values the normaliser could not trust. Shown to the reviewer; never blocks the row. */
  @Prop({ type: [String], default: [] }) needsReview: string[];

  // --- set by the admin at approval; CKAuto has no such data ---
  /** Our selling price. CKAuto is an auction with no asking price, so this is never ingested. */
  @Prop() priceKrw?: number;
  @Prop() color?: string;
  @Prop() plateOrVin?: string;
  @Prop() grade?: string;

  @Prop({ type: [VehicleImageSchema], default: [] })
  images: VehicleImage[];

  @Prop({ required: true, enum: VehicleStatus, default: VehicleStatus.PENDING, index: true })
  status: VehicleStatus;

  /** Anything the normaliser could not confidently map. Reviewed by hand. */
  @Prop({ type: Object, default: {} })
  unmapped: Record<string, unknown>;

  // --- catalogue publishing ---
  /** Admin-chosen catalogue-only fields (title, body type, ...), kept so a failed publish can be retried. */
  @Prop({ type: Object, default: {} })
  catalogueOverrides: Record<string, string>;

  /** _id of the car this vehicle became in the main catalogue. Set once published. */
  @Prop() catalogueCarId?: string;
  @Prop() publishedAt?: Date;
  /** Why the last approve could not publish. Cleared on success. */
  @Prop() publishError?: string;

  @Prop() lastError?: string;
  @Prop({ required: true }) firstSeenAt: Date;
  @Prop({ required: true }) lastSeenAt: Date;
}

export const VehicleSchema = SchemaFactory.createForClass(Vehicle);
