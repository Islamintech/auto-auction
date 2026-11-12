import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RawListingDocument = HydratedDocument<RawListing>;

/**
 * Verbatim copy of what the source returned. Never edited, never normalised.
 * This is the audit trail: if a normalised Vehicle ever looks wrong, the
 * original payload is right here to compare against.
 */
@Schema({ timestamps: true, collection: 'raw_listings' })
export class RawListing {
  /** The source site's own vehicle id. The single key everything hangs off. */
  @Prop({ required: true, index: true })
  sourceId: string;

  /** Hash of the payload - lets us detect "seen before, unchanged" cheaply. */
  @Prop({ required: true, index: true })
  payloadHash: string;

  @Prop({ type: Object, required: true })
  payload: Record<string, unknown>;

  @Prop({ required: true })
  fetchedAt: Date;
}

export const RawListingSchema = SchemaFactory.createForClass(RawListing);
RawListingSchema.index({ sourceId: 1, payloadHash: 1 }, { unique: true });
