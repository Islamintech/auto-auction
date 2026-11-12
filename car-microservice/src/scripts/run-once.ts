/**
 * One ingestion run, then exit. Needs MongoDB, Cloudinary and the CKAuto login,
 * but not Redis - it does not touch the queue or the daily schedule.
 *   npm run ingest:once
 * Exits 1 if the run itself fails (login, snapshot download), so it can be used
 * from cron or CI. Individual bad lots are counted in the summary instead.
 */
import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { CoreModule } from '../core.module';
import { IngestionService } from '../ingestion/ingestion.service';

(async () => {
  const app = await NestFactory.createApplicationContext(CoreModule.forRoot({ service: false }));
  let code = 0;
  try {
    const summary = await app.get(IngestionService).run();
    new Logger('run-once').log(JSON.stringify(summary));
  } catch (err) {
    new Logger('run-once').error((err as Error).message);
    code = 1;
  }
  await app.close();
  process.exit(code);
})().catch((err) => {
  // Boot failures, e.g. invalid configuration.
  console.error((err as Error).message);
  process.exit(1);
});
