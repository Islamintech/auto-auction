import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Bot, Context, GrammyError, InlineKeyboard, InputMediaBuilder } from 'grammy';
import type { InputMediaPhoto } from 'grammy/types';

import { Vehicle, VehicleDocument, VehicleStatus } from '../schemas/vehicle.schema';
import { IngestionService, ListingNotFoundError } from '../ingestion/ingestion.service';
import { CataloguePublishError, CatalogueService, brandCode, usdToKrwPrice } from '../catalogue/catalogue.service';
import { englishName } from '../catalogue/model-names';
import { buildCaption, escapeHtml } from './caption';
import { ImportRequest, parseImportRequest, parsePriceAndColour } from './parse';

/** Telegram's limit for one album. */
const MAX_ALBUM = 10;

const HELP = [
  '<b>Send a CKAuto car like this:</b>',
  '',
  'https://ckauto.co.kr/auction?v=261119G020',
  '30000-38000',
  'qora   <i>(colour, optional)</i>',
  '',
  'Line 1: the link (or just the lot code)',
  'Line 2: estimated price in USD, one number or a range',
  'Line 3: colour, if you want it in the post',
].join('\n');

/**
 * Admin-only Telegram bot: a CKAuto link in, a car on the site and a post in
 * the channel out.
 *
 *   admin sends link + USD price  ->  fetch that one lot, copy its photos
 *   bot shows the channel post    ->  ✅ Publish / ✏️ Edit name / ❌ Cancel
 *   Publish                       ->  catalogue car (site) + album in the channel
 *
 * Long polling, so it needs no public URL. Only users in TELEGRAM_ADMIN_IDS are
 * answered; everyone else is ignored without a reply.
 */
@Injectable()
export class BotService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly log = new Logger(BotService.name);
  private bot?: Bot;
  private admins = new Set<number>();
  /** Admin id -> lot code whose name they are about to type. */
  private renaming = new Map<number, string>();
  /** Admin id -> a link they sent without a price; the next message should be the price. */
  private awaitingPrice = new Map<number, { code: string; colour?: string }>();
  /** Lots being published right now, so a double tap cannot publish twice. */
  private publishing = new Set<string>();
  running = false;

  constructor(
    private readonly config: ConfigService,
    private readonly ingestion: IngestionService,
    private readonly catalogue: CatalogueService,
    @InjectModel(Vehicle.name) private readonly vehicleModel: Model<VehicleDocument>,
  ) {}

  private get channel(): string {
    return this.config.getOrThrow<string>('TELEGRAM_CHANNEL_ID');
  }

  private get contact(): string {
    return this.config.get<string>('TELEGRAM_CONTACT') || '@auctionuz_info';
  }

  private siteUrlFor(carId: string): string {
    const base = this.config.getOrThrow<string>('SITE_URL').replace(/\/+$/, '');
    return `${base}/products/${carId}`;
  }

  onApplicationBootstrap(): void {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      this.log.warn('TELEGRAM_BOT_TOKEN is not set - bot not started');
      return;
    }
    const ids = this.config.get<string>('TELEGRAM_ADMIN_IDS') || this.config.get<string>('TELEGRAM_CHAT_ID') || '';
    this.admins = new Set(ids.split(',').map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n > 0));
    if (!this.admins.size) {
      this.log.warn('TELEGRAM_ADMIN_IDS is empty - the bot would answer nobody, so it is not started');
      return;
    }

    const bot = new Bot(token);
    this.bot = bot;

    // Everyone who is not an admin is ignored, silently.
    bot.use(async (ctx, next) => {
      if (ctx.from && this.admins.has(ctx.from.id)) await next();
    });

    bot.command(['start', 'help'], (ctx) => ctx.reply(HELP, { parse_mode: 'HTML', link_preview_options: { is_disabled: true } }));
    bot.on('message:text', (ctx) => this.onText(ctx));
    bot.callbackQuery(/^(pub|ren|can|chn):([0-9A-Z]{10})$/, (ctx) => this.onButton(ctx, ctx.match[1], ctx.match[2]));
    bot.catch((err) => this.log.error(`Bot update failed: ${err.error instanceof Error ? err.error.message : String(err.error)}`));

    bot
      .start({
        allowed_updates: ['message', 'callback_query'],
        onStart: (me) => {
          this.running = true;
          this.log.log(`Telegram bot @${me.username} polling (${this.admins.size} admin(s))`);
        },
      })
      .catch((err) => {
        this.running = false;
        const conflict = err instanceof GrammyError && err.error_code === 409;
        this.log.error(
          conflict
            ? 'Telegram bot stopped: another program is already polling this bot token (409). Stop it, then restart this service.'
            : `Telegram bot stopped: ${(err as Error).message}`,
        );
      });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.bot && this.running) await this.bot.stop();
    this.running = false;
  }

  // --- messages ------------------------------------------------------------

  private async onText(ctx: Context): Promise<void> {
    const from = ctx.from!.id;
    const text = ctx.message!.text!.trim();

    const renameCode = this.renaming.get(from);
    if (renameCode) {
      this.renaming.delete(from);
      await this.rename(ctx, renameCode, text);
      return;
    }

    let req: ImportRequest;
    const parsed = parseImportRequest(text);
    const waiting = this.awaitingPrice.get(from);

    if (!('error' in parsed)) {
      req = parsed;
    } else if (parsed.error === 'no-price') {
      // A link on its own: keep it and ask for the price.
      this.awaitingPrice.set(from, { code: parsed.code, colour: parsed.colour });
      await ctx.reply(
        `👍 <b>${parsed.code}</b>. Now send the estimated price in USD, e.g. <code>3000-4500</code>` +
          ` (add the colour on a second line if you want it in the post).`,
        { parse_mode: 'HTML' },
      );
      return;
    } else if (waiting) {
      // The follow-up to a link sent without a price.
      const { price, colour } = parsePriceAndColour(text);
      if (!price) {
        await ctx.reply(
          `I couldn't read a price in that. Send it in USD like <code>3000-4500</code> or <code>3500</code>.`,
          { parse_mode: 'HTML' },
        );
        return;
      }
      this.awaitingPrice.delete(from);
      const c = colour ?? waiting.colour;
      req = { code: waiting.code, price, ...(c ? { colour: c } : {}) };
    } else {
      await ctx.reply(`I couldn't find a CKAuto link or lot code.\n\n${HELP}`, {
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
      });
      return;
    }
    this.awaitingPrice.delete(from);

    const status = await ctx.reply(`⏳ Fetching ${req.code} from CKAuto…`);
    const edit = (t: string) => ctx.api.editMessageText(ctx.chat!.id, status.message_id, t, { parse_mode: 'HTML' }).catch(() => undefined);

    let vehicle: VehicleDocument;
    try {
      vehicle = await this.ingestion.importOne(req.code);
    } catch (err) {
      await edit(
        err instanceof ListingNotFoundError
          ? `❌ Lot <b>${req.code}</b> was not found on CKAuto. Check the link.`
          : `❌ Couldn't fetch ${req.code}: ${escapeHtml((err as Error).message)}`,
      );
      return;
    }

    if (vehicle.catalogueCarId) {
      await edit(`ℹ️ ${req.code} is already published.\n${this.linksText(vehicle)}`);
      return;
    }
    if (!vehicle.images.some((i) => i.secureUrl)) {
      await edit(`❌ ${req.code} has no photos that could be copied, so it can't be published.`);
      return;
    }

    vehicle.priceUsd = req.price;
    if (req.colour) vehicle.color = req.colour;
    await vehicle.save();

    await ctx.api.deleteMessage(ctx.chat!.id, status.message_id).catch(() => undefined);
    await this.sendPreview(ctx.chat!.id, vehicle);
  }

  private async rename(ctx: Context, code: string, title: string): Promise<void> {
    const vehicle = await this.vehicleModel.findOne({ sourceId: code });
    if (!vehicle || vehicle.catalogueCarId) {
      await ctx.reply(vehicle ? `${code} is already published; rename it on the site.` : `${code} not found.`);
      return;
    }
    const carTitle = title.replace(/\s+/g, ' ').slice(0, 120);
    vehicle.catalogueOverrides = { ...(vehicle.catalogueOverrides ?? {}), carTitle };
    vehicle.markModified('catalogueOverrides');
    await vehicle.save();
    await this.sendPreview(ctx.chat!.id, vehicle);
  }

  // --- buttons -------------------------------------------------------------

  private async onButton(ctx: Context, action: string, code: string): Promise<void> {
    await ctx.answerCallbackQuery().catch(() => undefined);
    const vehicle = await this.vehicleModel.findOne({ sourceId: code });
    if (!vehicle) {
      await ctx.editMessageText(`${code} not found.`).catch(() => undefined);
      return;
    }

    if (action === 'ren') {
      this.renaming.set(ctx.from!.id, code);
      await ctx.reply(`✏️ Send the new name for ${code}, e.g. <code>Audi A6 55 TFSI quattro</code>`, { parse_mode: 'HTML' });
      return;
    }

    if (action === 'can') {
      if (vehicle.catalogueCarId) {
        await ctx.editMessageText(`${code} is already published; remove it on the site.\n${this.linksText(vehicle)}`, { parse_mode: 'HTML' });
        return;
      }
      vehicle.status = VehicleStatus.REJECTED;
      await vehicle.save();
      await ctx.editMessageText(`❌ ${code} cancelled. Nothing was published.`);
      return;
    }

    // pub / chn
    if (this.publishing.has(code)) return;
    this.publishing.add(code);
    try {
      await ctx.editMessageText(`⏳ Publishing ${code}…`).catch(() => undefined);
      await this.publish(ctx, vehicle);
    } finally {
      this.publishing.delete(code);
    }
  }

  private async publish(ctx: Context, vehicle: VehicleDocument): Promise<void> {
    const code = vehicle.sourceId;

    // 1. The site. Skipped when an earlier tap already got this far.
    if (!vehicle.catalogueCarId) {
      try {
        if (!vehicle.priceUsd) throw new CataloguePublishError('No price on this car - send the link again with a price', 'invalid');
        vehicle.priceKrwRange = usdToKrwPrice(vehicle.priceUsd, await this.catalogue.usdKrwRate());
        const input = this.catalogue.toCatalogueInput(vehicle.toObject(), vehicle.catalogueOverrides ?? {});
        const carId = await this.catalogue.publish(input);
        vehicle.set({ status: VehicleStatus.APPROVED, catalogueCarId: carId, publishedAt: new Date(), publishError: undefined });
        await vehicle.save();
      } catch (err) {
        const message = (err as Error).message;
        vehicle.publishError = message;
        await vehicle.save();
        const problems = err instanceof CataloguePublishError && err.problems.length ? `\n• ${err.problems.join('\n• ')}` : '';
        const clash = /duplicate|already|exist|clash/i.test(message + problems)
          ? '\n\nA car with this name and year may already be on the site: use ✏️ Edit name.'
          : '';
        await ctx.editMessageText(
          `❌ Couldn't publish ${code} on the site: ${escapeHtml(message)}${escapeHtml(problems)}${clash}`,
          { parse_mode: 'HTML', reply_markup: this.previewButtons(code) },
        );
        return;
      }
    }

    // 2. The channel.
    if (!vehicle.channelMessageId) {
      try {
        const caption = this.caption(vehicle, this.siteUrlFor(vehicle.catalogueCarId!));
        const sent = await this.sendAlbum(this.channel, vehicle, caption);
        vehicle.set({ channelMessageId: sent, channelPostedAt: new Date(), channelError: undefined });
        await vehicle.save();
      } catch (err) {
        vehicle.channelError = (err as Error).message;
        await vehicle.save();
        await ctx.editMessageText(
          `⚠️ ${code} is on the site, but the channel post failed: ${escapeHtml((err as Error).message)}\n` +
            `Is the bot an admin of ${escapeHtml(this.channel)} with "Post messages"?\n${this.linksText(vehicle)}`,
          { parse_mode: 'HTML', reply_markup: new InlineKeyboard().text('🔁 Retry channel post', `chn:${code}`) },
        );
        return;
      }
    }

    await ctx.editMessageText(`✅ ${code} published.\n${this.linksText(vehicle)}`, {
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    });
  }

  // --- output --------------------------------------------------------------

  private title(v: VehicleDocument): { title: string; complete: boolean } {
    const override = v.catalogueOverrides?.carTitle?.trim();
    if (override) return { title: override, complete: true };
    const n = englishName(brandCode(v.make), v.model, v.trim);
    return { title: n.name, complete: n.complete };
  }

  private caption(v: VehicleDocument, siteUrl?: string): string {
    return buildCaption(v, {
      title: this.title(v).title,
      price: v.priceUsd!,
      colour: v.color,
      siteUrl,
      contact: this.contact,
    });
  }

  private previewButtons(code: string): InlineKeyboard {
    return new InlineKeyboard()
      .text('✅ Publish', `pub:${code}`)
      .text('✏️ Edit name', `ren:${code}`)
      .row()
      .text('❌ Cancel', `can:${code}`);
  }

  /** The album exactly as the channel will get it, then a message with the buttons. */
  private async sendPreview(chatId: number, v: VehicleDocument): Promise<void> {
    await this.sendAlbum(chatId, v, this.caption(v));

    const { title, complete } = this.title(v);
    const notes: string[] = [];
    if (!complete) notes.push('⚠️ Part of the name was Korean and was left out - check it, or use ✏️ Edit name.');
    if (v.sourceStatus && v.sourceStatus !== 'LIVE') notes.push('⚠️ The CKAuto auction for this car has already ended.');
    const photos = v.images.filter((i) => i.secureUrl).length;

    await this.bot!.api.sendMessage(
      chatId,
      [
        `<b>${escapeHtml(v.sourceId)}</b> · ${escapeHtml(title)} · ${photos} photo(s)`,
        ...notes,
        '',
        `Publish to the site and ${escapeHtml(this.channel)}?`,
      ].join('\n'),
      { parse_mode: 'HTML', reply_markup: this.previewButtons(v.sourceId) },
    );
  }

  /** Sends up to 10 photos with the caption on the first. Returns the first message's id. */
  private async sendAlbum(chatId: number | string, v: VehicleDocument, caption: string): Promise<number> {
    const urls = [...v.images]
      .filter((i) => i.sourceId === v.sourceId && i.secureUrl)
      .sort((a, b) => a.order - b.order)
      .slice(0, MAX_ALBUM)
      .map((i) => telegramPhotoUrl(i.secureUrl!));
    if (!urls.length) throw new Error('no photos');

    const api = this.bot!.api;
    if (urls.length === 1) {
      const m = await api.sendPhoto(chatId, urls[0], { caption, parse_mode: 'HTML' });
      return m.message_id;
    }
    const media: InputMediaPhoto[] = urls.map((u, i) =>
      i === 0 ? InputMediaBuilder.photo(u, { caption, parse_mode: 'HTML' }) : InputMediaBuilder.photo(u),
    );
    const sent = await api.sendMediaGroup(chatId, media);
    return sent[0].message_id;
  }

  private linksText(v: VehicleDocument): string {
    const lines: string[] = [];
    if (v.catalogueCarId) lines.push(`🌐 Site: ${escapeHtml(this.siteUrlFor(v.catalogueCarId))}`);
    if (v.channelMessageId) {
      const ch = this.channel;
      lines.push(
        ch.startsWith('@')
          ? `📣 Channel: https://t.me/${escapeHtml(ch.slice(1))}/${v.channelMessageId}`
          : `📣 Channel post #${v.channelMessageId}`,
      );
    }
    return lines.join('\n');
  }
}

/**
 * Telegram fetches photos by URL and rejects ones over 5 MB. A Cloudinary
 * resize-and-compress transform keeps every photo well under that.
 */
export function telegramPhotoUrl(secureUrl: string): string {
  return secureUrl.includes('/image/upload/')
    ? secureUrl.replace('/image/upload/', '/image/upload/c_limit,w_1600,q_auto,f_jpg/')
    : secureUrl;
}
