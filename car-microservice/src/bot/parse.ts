/**
 * Reads an admin's import request:
 *
 *   https://ckauto.co.kr/auction?v=261119G020
 *   30000-38000
 *   qora                <- optional colour
 *
 * Order is not enforced: the line with the link or lot code, the line that is a
 * price, and whatever text is left over (the colour).
 */

export interface UsdPrice {
  min: number;
  max?: number;
}

export interface ImportRequest {
  code: string;
  price: UsdPrice;
  colour?: string;
}

/** CKAuto lot code: YYMMDD + letter + 3 digits, e.g. 261119G020. */
const CODE = /\b(\d{6}[A-Za-z]\d{3})\b/;

/** Words admins put around a price: "narx: 3000-4500 $", "price 3000 USD", "3000 dollar". */
const PRICE_WORDS = /\b(?:usd|dollars?|narxi?|taxminiy|price)\b|\$|:/gi;

/** What may remain on a price line once the words are gone: digits, k, separators. */
const PRICE_CHARS = /^[\d\s.,k\-–—~ ]+$/i;

/**
 * One amount: "30 000" / "30,000" / "30.000" (3-digit groups), "30000", "3k", "4.5k".
 * A group separator must be followed by exactly 3 digits, so "3000 4500" is two
 * amounts, not 30,004,500.
 */
const AMOUNT = /(\d{1,3}(?:[\s., ]\d{3})+(?!\d)|\d+(?:[.,]\d+)?\s*k?)/gi;

const amount = (s: string): number | undefined => {
  const t = s.replace(/\s| /g, '');
  let n: number;
  if (/k$/i.test(t)) n = Number(t.slice(0, -1).replace(',', '.')) * 1000;
  else n = Number(t.replace(/[.,]/g, ''));
  n = Math.round(n);
  return Number.isInteger(n) && n > 0 ? n : undefined;
};

/** The lot code from a CKAuto link (?v=...) or anywhere in the text. */
export function findLotCode(text: string): string | undefined {
  for (const m of text.matchAll(/https?:\/\/\S+/g)) {
    try {
      const v = new URL(m[0]).searchParams.get('v');
      if (v && CODE.test(v)) return v.toUpperCase();
    } catch {
      // not a URL after all; fall through to the plain search
    }
  }
  return CODE.exec(text)?.[1].toUpperCase();
}

export function parsePrice(line: string): UsdPrice | undefined {
  const s = line.replace(PRICE_WORDS, ' ').trim();
  if (!s || !PRICE_CHARS.test(s)) return undefined;
  // "30000-" is an unfinished range, not a price.
  if (/^[-–—~]|[-–—~]$/.test(s)) return undefined;
  const parts = s.match(AMOUNT) ?? [];
  if (parts.length < 1 || parts.length > 2) return undefined;
  // Nothing but separators may sit between/around the amounts.
  if (s.replace(AMOUNT, '').replace(/[\s\-–—~ ]/g, '') !== '') return undefined;
  const [min, max] = parts.map(amount);
  if (min === undefined || (parts.length === 2 && max === undefined)) return undefined;
  if (max === undefined || max === min) return { min };
  return max > min ? { min, max } : { min: max, max: min };
}

/** The price and optional colour from lines that are not the link. */
export function parsePriceAndColour(text: string): { price?: UsdPrice; colour?: string } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/https?:\/\/\S+/g, '').replace(new RegExp(CODE.source, 'gi'), '').trim())
    .filter(Boolean);

  let price: UsdPrice | undefined;
  const rest: string[] = [];
  for (const line of lines) {
    const p = price ? undefined : parsePrice(line);
    if (p) price = p;
    else rest.push(line);
  }
  const colour = rest[0]?.slice(0, 40);
  return { ...(price ? { price } : {}), ...(colour ? { colour } : {}) };
}

export function parseImportRequest(
  text: string,
): ImportRequest | { error: 'no-code' } | { error: 'no-price'; code: string; colour?: string } {
  const code = findLotCode(text);
  if (!code) return { error: 'no-code' };
  const { price, colour } = parsePriceAndColour(text);
  if (!price) return { error: 'no-price', code, ...(colour ? { colour } : {}) };
  return { code, price, ...(colour ? { colour } : {}) };
}

/** "30,000" or "30,000–38,000". */
export function formatUsd(p: UsdPrice): string {
  const f = (n: number) => n.toLocaleString('en-US');
  return p.max !== undefined ? `${f(p.min)}–${f(p.max)}` : f(p.min);
}
