import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { request } from 'undici';

export interface RunSummary {
  newCount: number;
  updatedCount: number;
  failedCount: number;
  samples: { sourceId: string; label: string }[];
}

/**
 * Notification only, by design. Admins get a nudge and a link; the actual
 * review happens in the admin panel where ten photos can be seen properly.
 */
@Injectable()
export class TelegramService {
  private readonly log = new Logger(TelegramService.name);

  constructor(private readonly config: ConfigService) {}

  async notifyRun(summary: RunSummary): Promise<void> {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    const chatId = this.config.get<string>('TELEGRAM_CHAT_ID');
    if (!token || !chatId) {
      this.log.warn('Telegram not configured - skipping notification');
      return;
    }
    if (!summary.newCount && !summary.failedCount) return;

    const panel = this.config.get('ADMIN_PANEL_URL') ?? '';
    const lines = [
      `<b>CKAuto ingestion</b>`,
      `New: <b>${summary.newCount}</b>  ·  Updated: ${summary.updatedCount}  ·  Failed: ${summary.failedCount}`,
    ];
    if (summary.samples.length) {
      lines.push('');
      lines.push(...summary.samples.slice(0, 5).map((s) => `• ${s.label}`));
      if (summary.newCount > 5) lines.push(`…and ${summary.newCount - 5} more`);
    }
    if (panel) {
      lines.push('');
      lines.push(`<a href="${panel}">Review in admin panel →</a>`);
    }

    await request(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: lines.join('\n'),
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
  }
}
