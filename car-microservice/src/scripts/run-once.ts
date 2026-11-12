/**
 * One-off run, for use while you are still confirming the endpoint shape:
 *   npm run ingest:once
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { IngestionService } from '../ingestion/ingestion.service';

(async () => {
  const app = await NestFactory.createApplicationContext(AppModule);
  const summary = await app.get(IngestionService).run();
  console.log(summary);
  await app.close();
  process.exit(0);
})();
