import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // On SIGTERM (every redeploy), let the queue worker close cleanly so a run
  // in progress is handed back to Redis rather than left marked active.
  app.enableShutdownHooks();
  const port = process.env.PORT ?? 3100;
  await app.listen(port);
  new Logger('Bootstrap').log(`auto-auction ingestion listening on ${port}`);
}

bootstrap().catch((err) => {
  // Most often invalid configuration: print the list and exit non-zero.
  console.error((err as Error).message);
  process.exit(1);
});
