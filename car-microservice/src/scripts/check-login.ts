/**
 * One CKAuto login attempt with the credentials in .env, and nothing else:
 *   npm run check:login
 * Prints success or CKAuto's own error text. Never prints the credentials or
 * the account's details. Each run is a real login attempt, so do not loop it.
 */
import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { SourceClientService } from '../source/source-client.service';

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true })], providers: [SourceClientService] })
class CheckLoginModule {}

(async () => {
  const app = await NestFactory.createApplicationContext(CheckLoginModule, { logger: ['error', 'warn'] });
  try {
    await app.get(SourceClientService).login();
    console.log('OK - CKAuto accepted the login in .env');
  } catch (err) {
    console.log(`FAILED - ${(err as Error).message}`);
    process.exitCode = 1;
  }
  await app.close();
})();
