import { Module } from '@nestjs/common';

import { CoreModule } from './core.module';
import { AdminController } from './admin/admin.controller';
import { HealthController } from './health/health.controller';
import { AdminTokenGuard } from './auth/admin-token.guard';
import { BotService } from './bot/bot.service';

/** The long-running service: core pipeline, the Telegram import bot and the admin HTTP API. */
@Module({
  imports: [CoreModule.forRoot({ service: true })],
  controllers: [AdminController, HealthController],
  providers: [AdminTokenGuard, BotService],
})
export class AppModule {}
