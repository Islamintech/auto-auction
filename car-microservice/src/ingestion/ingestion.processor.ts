import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { IngestionService } from './ingestion.service';

export const INGEST_QUEUE = 'ingest';

/**
 * Concurrency is deliberately 1. Two runs hitting the source at once would
 * both double our request rate and race each other on upserts.
 */
@Processor(INGEST_QUEUE, { concurrency: 1 })
export class IngestionProcessor extends WorkerHost {
  private readonly log = new Logger(IngestionProcessor.name);

  constructor(private readonly ingestion: IngestionService) {
    super();
  }

  async process(): Promise<unknown> {
    this.log.log('Starting ingestion run');
    return this.ingestion.run();
  }
}
