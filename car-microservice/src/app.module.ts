import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';

import { RawListing, RawListingSchema } from './schemas/raw-listing.schema';
import { Vehicle, VehicleSchema } from './schemas/vehicle.schema';
import { SourceClientService } from './source/source-client.service';
import { ImageService } from './images/image.service';
import { TelegramService } from './notify/telegram.service';
import { IngestionService } from './ingestion/ingestion.service';
import { IngestionProcessor, INGEST_QUEUE } from './ingestion/ingestion.processor';
import { IngestionScheduler } from './ingestion/ingestion.scheduler';
import { AdminController } from './admin/admin.controller';
import { AdminTokenGuard } from './auth/admin-token.guard';
import { CatalogueService } from './catalogue/catalogue.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({ uri: c.getOrThrow<string>('MONGODB_URI') }),
    }),
    MongooseModule.forFeature([
      { name: RawListing.name, schema: RawListingSchema },
      { name: Vehicle.name, schema: VehicleSchema },
    ]),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({
        connection: { url: c.getOrThrow<string>('REDIS_URL') },
      }),
    }),
    BullModule.registerQueue({ name: INGEST_QUEUE }),
  ],
  controllers: [AdminController],
  providers: [
    AdminTokenGuard,
    CatalogueService,
    SourceClientService,
    ImageService,
    TelegramService,
    IngestionService,
    IngestionProcessor,
    IngestionScheduler,
  ],
})
export class AppModule {}
