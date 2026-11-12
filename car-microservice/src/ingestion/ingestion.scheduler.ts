import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { INGEST_QUEUE } from './ingestion.processor';

const SCHEDULER_ID = 'daily-ingest';

@Injectable()
export class IngestionScheduler implements OnModuleInit {
  private readonly log = new Logger(IngestionScheduler.name);

  constructor(
    @InjectQueue(INGEST_QUEUE) private readonly queue: Queue,
    private readonly config: ConfigService,
  ) {}

  /**
   * Upserts one named schedule. Re-running with a changed INGEST_CRON replaces
   * the pattern instead of adding a second schedule next to the old one, and
   * any other schedule left in Redis (e.g. by an older version) is removed so
   * the source is never pulled twice a day by accident.
   */
  async onModuleInit(): Promise<void> {
    const pattern = this.config.get<string>('INGEST_CRON') || '0 4 * * *';

    for (const s of await this.queue.getJobSchedulers()) {
      if (s.key !== SCHEDULER_ID) {
        await this.queue.removeJobScheduler(s.key);
        this.log.warn(`Removed stale schedule ${s.key}`);
      }
    }

    await this.queue.upsertJobScheduler(
      SCHEDULER_ID,
      { pattern, tz: 'Asia/Seoul' },
      {
        name: 'daily',
        opts: {
          removeOnComplete: 50,
          removeOnFail: 100,
          attempts: 3,
          backoff: { type: 'exponential', delay: 60_000 },
        },
      },
    );
    this.log.log(`Daily ingestion scheduled (${pattern} Asia/Seoul)`);
  }

  /** Manual kick, used by the admin controller. Not retried: the admin can press it again. */
  async triggerNow(): Promise<void> {
    await this.queue.add('manual', {}, { removeOnComplete: 50, removeOnFail: 100 });
  }
}
