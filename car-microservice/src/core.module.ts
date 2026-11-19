import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { validateEnv } from './config/env.validation';
import { RawListing, RawListingSchema } from './schemas/raw-listing.schema';
import { Vehicle, VehicleSchema } from './schemas/vehicle.schema';
import { SourceClientService } from './source/source-client.service';
import { ImageService } from './images/image.service';
import { IngestionService } from './ingestion/ingestion.service';
import { CatalogueService } from './catalogue/catalogue.service';

const PROVIDERS = [SourceClientService, ImageService, IngestionService, CatalogueService];

/**
 * Everything an import needs: config, MongoDB and the pipeline services. The
 * long-running service (AppModule) adds the Telegram bot and admin API on top.
 */
@Module({})
export class CoreModule {
  static forRoot(opts: { service: boolean }): DynamicModule {
    return {
      module: CoreModule,
      imports: [
        ConfigModule.forRoot({ isGlobal: true, validate: (env) => validateEnv(env, opts) }),
        MongooseModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (c: ConfigService) => ({ uri: c.getOrThrow<string>('MONGODB_URI') }),
        }),
        MongooseModule.forFeature([
          { name: RawListing.name, schema: RawListingSchema },
          { name: Vehicle.name, schema: VehicleSchema },
        ]),
      ],
      providers: PROVIDERS,
      exports: [...PROVIDERS, MongooseModule],
    };
  }
}
