import {
  BadGatewayException,
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Vehicle, VehicleDocument, VehicleStatus } from '../schemas/vehicle.schema';
import { IngestionScheduler } from '../ingestion/ingestion.scheduler';
import { AdminTokenGuard } from '../auth/admin-token.guard';
import {
  CatalogueOverrides,
  CataloguePublishError,
  CatalogueService,
} from '../catalogue/catalogue.service';

/** Normalised fields an admin may correct at approval time. Nothing else is writable. */
const EDITABLE_TEXT = ['make', 'model', 'trim', 'fuelType', 'transmission', 'color', 'plateOrVin', 'grade'] as const;
const EDITABLE_INT = ['year', 'mileageKm', 'priceKrw'] as const;
const OVERRIDE_KEYS = ['carTitle', 'carType', 'carCondition', 'carDesc'] as const;

type ApproveBody = Partial<Record<(typeof EDITABLE_TEXT)[number], string>> &
  Partial<Record<(typeof EDITABLE_INT)[number], number | string>> &
  CatalogueOverrides;

/**
 * Thin API for the admin panel. Review happens in the panel, not in Telegram.
 * Every route requires the ADMIN_API_TOKEN bearer token.
 */
@UseGuards(AdminTokenGuard)
@Controller('admin/vehicles')
export class AdminController {
  constructor(
    @InjectModel(Vehicle.name) private readonly vehicleModel: Model<VehicleDocument>,
    private readonly scheduler: IngestionScheduler,
    private readonly catalogue: CatalogueService,
  ) {}

  @Get()
  async list(
    @Query('status') status: VehicleStatus = VehicleStatus.PENDING,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    if (!Object.values(VehicleStatus).includes(status)) {
      throw new BadRequestException(`status must be one of ${Object.values(VehicleStatus).join(', ')}`);
    }
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const [items, total] = await Promise.all([
      this.vehicleModel.find({ status }).sort({ firstSeenAt: -1 }).skip((p - 1) * l).limit(l).lean(),
      this.vehicleModel.countDocuments({ status }),
    ]);
    return { items, total, page: p, limit: l };
  }

  // Declared before ':sourceId' routes so "run-now" is never read as an id.
  @Post('run-now')
  async runNow() {
    await this.scheduler.triggerNow();
    return { ok: true, queued: true };
  }

  @Get(':sourceId')
  async detail(@Param('sourceId') sourceId: string) {
    const vehicle = await this.vehicleModel.findOne({ sourceId }).lean();
    if (!vehicle) throw new NotFoundException(`No vehicle ${sourceId}`);
    // Show the admin exactly what approval would send, before they press it.
    const preview = this.catalogue.toCatalogueInput(vehicle, vehicle.catalogueOverrides);
    return { ...vehicle, cataloguePreview: preview, missing: this.catalogue.missingFields(preview) };
  }

  /**
   * Saves the admin's corrections, then publishes to the catalogue. The vehicle
   * only becomes APPROVED once the catalogue has accepted it, so "approved"
   * always means "is in the catalogue". On failure the corrections are kept and
   * the reason is returned, so the admin can fix it and press approve again.
   */
  @Post(':sourceId/approve')
  async approve(@Param('sourceId') sourceId: string, @Body() body: ApproveBody = {}) {
    const vehicle = await this.vehicleModel.findOne({ sourceId });
    if (!vehicle) throw new NotFoundException(`No vehicle ${sourceId}`);

    if (vehicle.status === VehicleStatus.APPROVED && vehicle.catalogueCarId) {
      return { ok: true, sourceId, status: vehicle.status, catalogueCarId: vehicle.catalogueCarId };
    }

    const { set, problems } = this.parseEdits(body ?? {});
    if (problems.length) throw new BadRequestException({ message: 'Invalid edits', problems });

    const overrides: CatalogueOverrides = { ...(vehicle.catalogueOverrides ?? {}) };
    for (const k of OVERRIDE_KEYS) {
      if (body?.[k] !== undefined) overrides[k] = String(body[k]).trim();
    }

    vehicle.set({ ...set, catalogueOverrides: overrides });
    await vehicle.save();

    try {
      const catalogueCarId = await this.catalogue.publish(
        this.catalogue.toCatalogueInput(vehicle.toObject(), overrides),
      );
      vehicle.set({
        status: VehicleStatus.APPROVED,
        catalogueCarId,
        publishedAt: new Date(),
        publishError: undefined,
      });
      await vehicle.save();
      return { ok: true, sourceId, status: VehicleStatus.APPROVED, catalogueCarId };
    } catch (err) {
      const message = (err as Error).message;
      await this.vehicleModel.updateOne({ sourceId }, { $set: { publishError: message } });
      if (err instanceof CataloguePublishError) {
        const payload = { message, problems: err.problems };
        throw err.kind === 'invalid' ? new BadRequestException(payload) : new BadGatewayException(payload);
      }
      throw err;
    }
  }

  @Post(':sourceId/reject')
  async reject(@Param('sourceId') sourceId: string) {
    const vehicle = await this.vehicleModel.findOne({ sourceId });
    if (!vehicle) throw new NotFoundException(`No vehicle ${sourceId}`);
    if (vehicle.catalogueCarId) {
      // Rejecting here would not take it out of the catalogue; say so instead
      // of leaving the two out of step.
      throw new ConflictException(
        'Already published to the catalogue - remove it there (car ' + vehicle.catalogueCarId + ')',
      );
    }
    vehicle.status = VehicleStatus.REJECTED;
    await vehicle.save();
    return { ok: true, sourceId, status: VehicleStatus.REJECTED };
  }

  private parseEdits(body: ApproveBody): { set: Partial<Vehicle>; problems: string[] } {
    const set: Record<string, unknown> = {};
    const problems: string[] = [];
    for (const k of EDITABLE_TEXT) {
      if (body[k] === undefined) continue;
      const s = String(body[k]).trim();
      set[k] = s.length ? s : undefined;
    }
    for (const k of EDITABLE_INT) {
      if (body[k] === undefined || body[k] === '') continue;
      const n = Number(String(body[k]).replace(/[,\s]/g, ''));
      if (!Number.isInteger(n) || n < 0) problems.push(`${k} must be a whole non-negative number`);
      else set[k] = n;
    }
    return { set: set as Partial<Vehicle>, problems };
  }
}
