import { Vehicle } from '../schemas/vehicle.schema';
import { formatUsd, UsdPrice } from './parse';

/**
 * The channel post caption (Telegram HTML, Uzbek).
 *
 * Laid out after the channel's existing posts (e.g. t.me/hmauctionuz/3640).
 * Wording lives only here, so changing the post format is a one-file edit.
 *
 * The auction end time is for the channel only; it is never sent to the site.
 */

export interface CaptionInput {
  title: string;
  price: UsdPrice;
  colour?: string;
  /** The car's page on the site. Absent in the admin's preview (the car does not exist yet). */
  siteUrl?: string;
  /** Telegram handle buyers should write to, e.g. "@auctionuz_info". */
  contact: string;
}

/** Telegram's HTML parse mode only needs these three (plus quotes inside attributes). */
export const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const FUEL_UZ: Record<string, string> = {
  PETROL: 'Benzin',
  DIESEL: 'Dizel',
  HYBRID: 'Gibrid',
  ELECTRIC: 'Elektr',
  LPG: 'Gaz (LPG)',
};

const TRANSMISSION_UZ: Record<string, string> = { AUTO: 'Avtomat', MANUAL: 'Mexanika' };

/** Tashkent is UTC+5 all year (no DST). */
const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;

/** 2026-11-19T01:00Z -> "2026.11.19 06:00". */
export function tashkentTime(d: Date): string {
  const t = new Date(d.getTime() + TASHKENT_OFFSET_MS);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${t.getUTCFullYear()}.${p(t.getUTCMonth() + 1)}.${p(t.getUTCDate())} ${p(t.getUTCHours())}:${p(t.getUTCMinutes())}`;
}

/** "3.0L Benzin", "Elektr", "Dizel" - whatever the data supports. */
function engine(v: Pick<Vehicle, 'displacementCc' | 'fuelType'>): string | undefined {
  const fuel = v.fuelType ? FUEL_UZ[v.fuelType] : undefined;
  const litres =
    v.fuelType !== 'ELECTRIC' && v.displacementCc && v.displacementCc >= 500
      ? `${(Math.round(v.displacementCc / 100) / 10).toFixed(1)}L`
      : undefined;
  return [litres, fuel].filter(Boolean).join(' ') || undefined;
}

type CaptionVehicle = Pick<
  Vehicle,
  'year' | 'month' | 'mileageKm' | 'displacementCc' | 'fuelType' | 'transmission' | 'auctionEndsAt'
>;

export function buildCaption(v: CaptionVehicle, c: CaptionInput): string {
  const lines: string[] = [`🚗 <b>${escapeHtml(c.title)}</b>`, ''];

  if (v.year) lines.push(`📅 <b>Yili:</b> ${v.year}${v.month ? `/${String(v.month).padStart(2, '0')}` : ''}`);
  if (v.mileageKm !== undefined && v.mileageKm !== null) {
    lines.push(`🛣 <b>Probeg:</b> ${v.mileageKm.toLocaleString('en-US')} km`);
  }
  const eng = engine(v);
  if (eng) lines.push(`⛽️ <b>Dvigatel:</b> ${eng}`);
  const gearbox = v.transmission ? TRANSMISSION_UZ[v.transmission] : undefined;
  if (gearbox) lines.push(`⚙️ <b>Uzatmalar qutisi:</b> ${gearbox}`);
  if (c.colour) lines.push(`🎨 <b>Rangi:</b> ${escapeHtml(c.colour)}`);

  lines.push('', `💰 <b>Taxminiy narx:</b> ${formatUsd(c.price)} USD`);
  if (v.auctionEndsAt) {
    lines.push(`⏳ <b>Auksion tugashi:</b> ${tashkentTime(new Date(v.auctionEndsAt))} (Toshkent vaqti)`);
  }

  lines.push('', `📞 <b>Aloqa:</b> ${escapeHtml(c.contact)}`);
  lines.push(c.siteUrl ? `🔗 <a href="${escapeHtml(c.siteUrl)}">Saytda ko'rish</a>` : `🔗 Saytda ko'rish`);

  return lines.join('\n');
}
