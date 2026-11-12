import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { InjectQueue } from '@nestjs/bullmq';
import { Connection } from 'mongoose';
import { Queue } from 'bullmq';
import { INGEST_QUEUE } from '../ingestion/ingestion.processor';

/**
 * Liveness for the host (Railway healthcheck, uptime monitors). Public and
 * deliberately boring: it says whether MongoDB and Redis answer, nothing else.
 */
@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection() private readonly mongo: Connection,
    @InjectQueue(INGEST_QUEUE) private readonly queue: Queue,
  ) {}

  @Get()
  async check() {
    const mongo = this.mongo.readyState === 1;
    // With Redis down, ioredis queues the PING and retries indefinitely, so an
    // unbounded wait would hang the endpoint instead of reporting the outage.
    const timeout = new Promise<false>((resolve) => setTimeout(() => resolve(false), 2_000).unref());
    const ping = this.queue.client
      // BullMQ types its client loosely; underneath it is ioredis.
      .then((c) => (c as unknown as { ping(): Promise<string> }).ping())
      .then((r) => r === 'PONG')
      .catch(() => false);
    const redis = await Promise.race([ping, timeout]);

    const body = { status: mongo && redis ? 'ok' : 'degraded', mongo, redis };
    if (!mongo || !redis) throw new ServiceUnavailableException(body);
    return body;
  }
}
