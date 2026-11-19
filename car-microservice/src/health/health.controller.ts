import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { BotService } from '../bot/bot.service';

/**
 * Liveness for the host (Railway healthcheck, uptime monitors). Public and
 * deliberately boring. Only MongoDB decides healthy/unhealthy; the bot's state
 * is reported but a restart would not fix a 409 from a second poller.
 */
@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection() private readonly mongo: Connection,
    private readonly bot: BotService,
  ) {}

  @Get()
  check() {
    const mongo = this.mongo.readyState === 1;
    const body = { status: mongo ? 'ok' : 'degraded', mongo, bot: this.bot.running };
    if (!mongo) throw new ServiceUnavailableException(body);
    return body;
  }
}
