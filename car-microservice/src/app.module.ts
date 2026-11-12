import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

import { CoreModule } from './core.module';
import { IngestionProcessor, INGEST_QUEUE } from './ingestion/ingestion.processor';
import { IngestionScheduler } from './ingestion/ingestion.scheduler';
import { AdminController } from './admin/admin.controller';
import { HealthController } from './health/health.controller';
import { AdminTokenGuard } from './auth/admin-token.guard';

/** The long-running service: core pipeline + Redis queue, daily schedule and HTTP API. */
@Module({
  imports: [
    CoreModule.forRoot({ service: true }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({
        connection: { url: c.getOrThrow<string>('REDIS_URL') },
      }),
    }),
    BullModule.registerQueue({ name: INGEST_QUEUE }),
  ],
  controllers: [AdminController, HealthController],
  providers: [AdminTokenGuard, IngestionProcessor, IngestionScheduler],
})
export class AppModule {}
