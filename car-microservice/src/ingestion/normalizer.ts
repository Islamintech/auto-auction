import { createHash } from 'crypto';

/**
 * CKAuto vehicle record as served by GET /api/app/state (logged in).
 * See docs/ckauto-api.md. Every key is always present; "absent" is "".
 * Everything is a string except photoFiles, isMyBid and currentBid (string|number).
 */
export interface CkRaw {
  code: string;
  insurer: string;
  manufacturer: string;
  model: string;
  modelName: string;
  grade: string;
  yearMonth: string;
  yard: string;
  process: string;
  progressMethod: string;
  status: string;
  transmission: string;
  fuel: string;
  mileage: string;
  currentMileage: string;
  auctionEnd: string;
  createdAt: string;
  photoFiles: string[];
  engineType: string;
  displacement: string;
  inspectionDate: string;
  commission: string;
  cost: string;
  memo: string;
  currentBid: string | number;
  lastBidAt: string;
  documentFeeType: string;
  documentFee: string;
  [key: string]: unknown;
}

/**
 * Removed from every record before it is stored or hashed - including the raw
 * audit copy. highestBidder holds real CKAuto member names; isMyBid describes
 * our account, not the car. Neither has any business in our database.
 */
export const STRIPPED_KEYS = ['highestBidder', 'isMyBid'] as const;

export function sanitise(raw: Record<string, unknown>): Record<string, unknown> {
  const clean = { ...raw };
  for (const k of STRIPPED_KEYS) delete clean[k];
  return clean;
}

export interface NormalisedImage {
  sourceId: string;
  sourceUrl: string;
  order: number;
}

export interface NormalisedVehicle {
  sourceId: string;
  payloadHash: string;
  sourceStatus: string;
  insurer?: string;
  make?: string;
  model?: string;
  modelName?: string;
  trim?: string;
  year?: number;
  month?: number;
  location?: string;
  disposalType: string;
  damageType: string;
  fuelType?: string;
  transmission?: string;
  mileageKm?: number;
  engineCode?: string;
  displacementCc?: number;
  inspectionDate?: Date;
  auctionEndsAt?: Date;
  listedAt?: Date;
  commissionRate?: number;
  costKrw?: number;
  documentFeeKrw?: number;
  documentFeeFor?: string;
  currentBidKrw?: number;
  lastBidAt?: Date;
  notes?: string;
  images: NormalisedImage[];
  /** Values that did not parse or fell outside the known enums. Shown to the reviewer. */
  needsReview: string[];
  /** Source keys this normaliser does not know. Empty unless CKAuto adds fields. */
  unmapped: Record<string, unknown>;
}

// ---- enums (docs/ckauto-api.md §4) -----------------------------------------
// Values are kept in Korean-free canonical form; synonyms collapse here
// (오토≡자동, 수동≡매뉴얼, 전기≡EV).

const TRANSMISSION: Record<string, string> = { 오토: 'AUTO', 자동: 'AUTO', 수동: 'MANUAL', 매뉴얼: 'MANUAL' };
const FUEL: Record<string, string> = {
  가솔린: 'PETROL', 디젤: 'DIESEL', 하이브리드: 'HYBRID', 전기: 'ELECTRIC', EV: 'ELECTRIC', LPG: 'LPG',
};
const DAMAGE: Record<string, string> = { 전손: 'TOTAL_LOSS', 분손: 'PARTIAL_LOSS', 침수: 'FLOOD' };
const PROCESS: Record<string, string> = {
  폐차: 'SCRAP', 이전: 'TRANSFER', '이전+폐차': 'TRANSFER_OR_SCRAP', 배터리: 'BATTERY',
  전기차배터리: 'EV_BATTERY', 단품: 'PARTS', 단품매각: 'PARTS_SALE', 타사전손: 'THIRD_PARTY_TOTAL_LOSS',
};
export const SOURCE_STATUS: Record<string, string> = { 공매진행: 'LIVE', 낙찰대기: 'PENDING_AWARD', 낙찰: 'AWARDED' };

const KNOWN_KEYS = new Set([
  'code', 'insurer', 'manufacturer', 'model', 'modelName', 'grade', 'yearMonth', 'yard', 'process',
  'progressMethod', 'status', 'transmission', 'fuel', 'mileage', 'currentMileage', 'auctionEnd',
  'createdAt', 'photoFiles', 'engineType', 'displacement', 'inspectionDate', 'commission', 'cost',
  'memo', 'currentBid', 'lastBidAt', 'documentFeeType', 'documentFee', ...STRIPPED_KEYS,
]);

/** Odometers above this are placeholder junk, not cars (1,111,111 is common). */
const MAX_PLAUSIBLE_KM = 999_999;

// ---- parsers ---------------------------------------------------------------

export function hashPayload(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

const text = (v: unknown): string | undefined => {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  return s.length ? s : undefined;
};

/** "37,914" -> 37914. Empty, zero or non-numeric -> undefined. */
export const commaInt = (v: unknown): number | undefined => {
  const s = text(v);
  if (!s) return undefined;
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
};

/** "2026-11-13 13:00" is KST with no offset. Attach +09:00 or it lands 9h off. */
export const kst = (v: unknown): Date | undefined => {
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::(\d{2}))?$/.exec(text(v) ?? '');
  if (!m) return undefined;
  const d = new Date(`${m[1]}T${m[2]}:${m[3] ?? '00'}+09:00`);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

/** "2025-11-19" as a KST calendar date. */
const kstDate = (v: unknown): Date | undefined => {
  const s = text(v);
  return s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? kst(`${s} 00:00`) : undefined;
};

/** "2017년 10월" -> { year: 2017, month: 10 }. */
export const yearMonth = (v: unknown): { year?: number; month?: number } => {
  const m = /(\d{4})\s*년\s*(\d{1,2})\s*월/.exec(text(v) ?? '');
  if (!m) return {};
  const year = +m[1];
  const month = +m[2];
  return year >= 1950 && year <= 2100 && month >= 1 && month <= 12 ? { year, month } : {};
};

/** "5%" and "0.05" are the same value in two encodings. */
export const commission = (v: unknown): number | undefined => {
  const s = text(v);
  if (!s) return undefined;
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return undefined;
  return s.endsWith('%') || n > 1 ? n / 100 : n;
};

/** A plausible odometer reading, or undefined. Rejects 1,111,111-style placeholders. */
const plausibleKm = (n: number | undefined): number | undefined => {
  if (n === undefined || n > MAX_PLAUSIBLE_KM) return undefined;
  const digits = String(n);
  if (digits.length >= 6 && /^(\d)\1+$/.test(digits)) return undefined;
  return n;
};

/**
 * Turns one CKAuto record into our shape.
 *
 * Two rules that matter:
 *  1. sourceId (CKAuto `code`) is resolved first. If it is missing we throw
 *     rather than inventing one - a vehicle without a stable id cannot be
 *     safely deduped.
 *  2. Images are stamped with that sourceId as they are read out of the same
 *     object. They are never collected separately and matched up later, which
 *     is the usual way photos end up on the wrong car.
 *
 * Dirty values never fail the row: legacy records carry column-shifted junk in
 * process/progressMethod ("n? 2n26_11-( "). Those become UNKNOWN and are listed
 * in needsReview for the admin.
 */
export function normalise(input: Record<string, unknown>, sourceOrigin: string): NormalisedVehicle {
  const raw = sanitise(input) as CkRaw;
  const sourceId = text(raw.code);
  if (!sourceId) {
    throw new Error(`Listing has no code. Keys seen: ${Object.keys(raw).join(', ')}`);
  }

  const needsReview: string[] = [];
  const enumOf = (field: string, table: Record<string, string>, v: unknown, fallback?: string) => {
    const s = text(v);
    if (!s) return fallback;
    const mapped = table[s];
    if (!mapped) needsReview.push(`${field}: unrecognised value "${s}"`);
    return mapped ?? fallback;
  };

  // Photos: photoFiles holds root-relative paths, sometimes with a cache-busting
  // suffix, so always use the array and never rebuild names from the code.
  const images: NormalisedImage[] = [];
  const seen = new Set<string>();
  (Array.isArray(raw.photoFiles) ? raw.photoFiles : []).forEach((p) => {
    const path = text(p);
    if (!path) return;
    const url = new URL(path, sourceOrigin).toString();
    if (seen.has(url)) return;
    seen.add(url);
    images.push({ sourceId, sourceUrl: url, order: images.length });
  });

  // `mileage` is populated far more reliably than `currentMileage`, which also
  // carries placeholders (the sample record has 37,914 vs 1,111,111).
  const odometer = commaInt(raw.mileage) ?? commaInt(raw.currentMileage);
  const mileageKm = plausibleKm(odometer);
  if (odometer !== undefined && mileageKm === undefined) {
    needsReview.push(`mileage: implausible value ${odometer.toLocaleString('en-US')} km`);
  }

  const { year, month } = yearMonth(raw.yearMonth);
  if (text(raw.yearMonth) && year === undefined) needsReview.push(`yearMonth: could not parse "${raw.yearMonth}"`);

  const unmapped: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!KNOWN_KEYS.has(k)) unmapped[k] = v;
  }

  return {
    sourceId,
    payloadHash: hashPayload(raw),
    sourceStatus: enumOf('status', SOURCE_STATUS, raw.status, 'UNKNOWN')!,
    insurer: text(raw.insurer),
    make: text(raw.manufacturer),
    model: text(raw.model),
    modelName: text(raw.modelName),
    trim: text(raw.grade),
    year,
    month,
    location: text(raw.yard),
    disposalType: enumOf('process', PROCESS, raw.process, 'UNKNOWN')!,
    damageType: enumOf('progressMethod', DAMAGE, raw.progressMethod, 'UNKNOWN')!,
    fuelType: enumOf('fuel', FUEL, raw.fuel),
    transmission: enumOf('transmission', TRANSMISSION, raw.transmission),
    mileageKm,
    engineCode: text(raw.engineType),
    displacementCc: commaInt(raw.displacement),
    inspectionDate: kstDate(raw.inspectionDate),
    auctionEndsAt: kst(raw.auctionEnd),
    listedAt: kst(raw.createdAt),
    commissionRate: commission(raw.commission),
    costKrw: commaInt(raw.cost),
    documentFeeKrw: commaInt(raw.documentFee),
    documentFeeFor: text(raw.documentFeeType) ? PROCESS[text(raw.documentFeeType)!] : undefined,
    currentBidKrw: commaInt(raw.currentBid),
    lastBidAt: kst(raw.lastBidAt),
    notes: text(raw.memo),
    images,
    needsReview,
    unmapped,
  };
}
