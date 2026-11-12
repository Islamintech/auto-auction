import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { INGEST_QUEUE } from './ingestion.processor';

@Injectable()
export class IngestionScheduler implements OnModuleInit {
  private readonly log = new Logger(IngestionScheduler.name);

  constructor(
    @InjectQueue(INGEST_QUEUE) private readonly queue: Queue,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const pattern = this.config.get<string>('INGEST_CRON') ?? '0 4 * * *';
    await this.queue.add(
      'daily',
      {},
      {
        repeat: { pattern, tz: 'Asia/Seoul' },
        jobId: 'daily-ingest',
        removeOnComplete: 50,
        removeOnFail: 100,
        attempts: 3,
        backoff: { type: 'exponential', delay: 60_000 },
      },
    );
    this.log.log(`Daily ingestion scheduled (${pattern} Asia/Seoul)`);
  }

  /** Manual kick, used by the admin controller. */
  async triggerNow(): Promise<void> {
    await this.queue.add('manual', {}, { removeOnComplete: 50 });
  }
}
