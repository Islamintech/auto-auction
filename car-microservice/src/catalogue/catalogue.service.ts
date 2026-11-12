import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { request } from 'undici';
import { Vehicle } from '../schemas/vehicle.schema';

/**
 * Fields only the catalogue knows about. The source has no notion of body type
 * or our wording for a title, so the admin supplies these at approval time;
 * anything left out falls back to a value derived from the vehicle.
 */
export interface CatalogueOverrides {
  carTitle?: string;
  carType?: string;
  carCondition?: string;
  carDesc?: string;
}

/** The body POST /internal/car/import accepts on the main auction backend. */
export interface CatalogueCarInput {
  importSource: string;
  importId: string;
  carTitle: string;
  carBrand: string;
  carModel?: string;
  carVin?: string;
  carType?: string;
  carCondition?: string;
  carFuel?: string;
  carTransmission?: string;
  carYear: string;
  carMileage: number;
  carPrice: string;
  carColor?: string;
  carDesc?: string;
  carImages: string[];
}

export class CataloguePublishError extends Error {
  constructor(
    message: string,
    /** Our fault (bad data) vs. theirs (down, misconfigured). Drives the HTTP status we answer with. */
    readonly kind: 'invalid' | 'unavailable',
    readonly problems: string[] = [],
  ) {
    super(message);
  }
}

// Source listings are Korean; the catalogue uses fixed English enums. Order
// matters: hybrids are listed as e.g. "가솔린+전기", so they are tested first.
const FUEL_RULES: [RegExp, string][] = [
  [/하이브리드|hybrid|\+\s*전기|phev|hev/i, 'HYBRID'],
  [/전기|electric|\bev\b/i, 'ELECTRIC'],
  [/lpg|lpi|가스/i, 'LPG'],
  [/디젤|경유|diesel/i, 'DIESEL'],
  [/가솔린|휘발유|gasoline|petrol/i, 'PETROL'],
];

const TRANSMISSION_RULES: [RegExp, string][] = [
  [/cvt|무단/i, 'CVT'],
  [/dct|dsg|듀얼\s*클러치/i, 'DCT'],
  [/수동|매뉴얼|manual|\bm\/?t\b/i, 'MANUAL'],
  [/오토|자동|auto|\ba\/?t\b/i, 'AUTO'],
];

// Korean maker names to the brand spellings the catalogue already uses.
const BRAND_ALIASES: [RegExp, string][] = [
  // Genesis first: CKAuto may label it under 현대.
  [/제네시스|genesis/i, 'GENESIS'],
  [/현대|hyundai/i, 'HYUNDAI'],
  [/기아|kia/i, 'KIA'],
  [/르노|삼성|renault|samsung/i, 'SAMSUNG'],
  [/쉐보레|한국\s*gm|chevrolet|gm\s*daewoo|대우/i, 'CHEVROLET'],
  [/쌍용|kg\s*모빌리티|ssangyong|kg\s*mobility/i, 'SSANGYONG'],
  [/벤츠|메르세데스|mercedes|benz/i, 'MERCEDES'],
  [/bmw/i, 'BMW'],
  [/아우디|audi/i, 'AUDI'],
  [/토요타|도요타|toyota/i, 'TOYOTA'],
  [/혼다|honda/i, 'HONDA'],
  [/테슬라|tesla/i, 'TESLA'],
  [/렉서스|lexus/i, 'LEXUS'],
  [/폭스바겐|volkswagen/i, 'VOLKSWAGEN'],
  [/볼보|volvo/i, 'VOLVO'],
  [/포드|ford/i, 'FORD'],
  [/지프|jeep/i, 'JEEP'],
  [/미니|^mini/i, 'MINI'],
  [/포르쉐|porsche/i, 'PORSCHE'],
  [/닛산|nissan/i, 'NISSAN'],
  [/인피니티|infiniti/i, 'INFINITI'],
  [/랜드로버|land\s*rover/i, 'LAND ROVER'],
  [/재규어|jaguar/i, 'JAGUAR'],
  [/푸조|peugeot/i, 'PEUGEOT'],
  [/시트로엥|citro[eë]n/i, 'CITROEN'],
  [/캐딜락|cadillac/i, 'CADILLAC'],
  [/링컨|lincoln/i, 'LINCOLN'],
  [/크라이슬러|chrysler/i, 'CHRYSLER'],
  [/마세라티|maserati/i, 'MASERATI'],
  [/마쓰다|마쯔다|mazda/i, 'MAZDA'],
  [/미쓰비시|mitsubishi/i, 'MITSUBISHI'],
  [/폴스타|polestar/i, 'POLESTAR'],
];

const COLOR_ALIASES: [RegExp, string][] = [
  [/흰|화이트|백색|white|진주|펄/i, 'WHITE'],
  [/검정|블랙|흑색|black/i, 'BLACK'],
  [/은색|실버|silver/i, 'SILVER'],
  [/회색|쥐색|그레이|gray|grey/i, 'GRAY'],
  [/빨강|레드|red/i, 'RED'],
  [/파랑|블루|청색|blue/i, 'BLUE'],
];

const firstMatch = (rules: [RegExp, string][], v?: string) =>
  v ? rules.find(([re]) => re.test(v))?.[1] : undefined;

/** A VIN is 17 characters with no I, O or Q. Korean plates ("12가3456") are not. */
const asVin = (v?: string) => {
  const s = v?.replace(/\s+/g, '').toUpperCase();
  return s && /^[A-HJ-NPR-Z0-9]{17}$/.test(s) ? s : undefined;
};

/**
 * Pushes approved vehicles into the main after-auction catalogue through its
 * internal import route. The route is idempotent on (importSource, importId),
 * so a retry after a timeout returns the car the first attempt made.
 */
@Injectable()
export class CatalogueService {
  private readonly log = new Logger(CatalogueService.name);

  constructor(private readonly config: ConfigService) {}

  /** Builds the catalogue payload from a vehicle. Pure - no I/O. */
  toCatalogueInput(v: Vehicle, overrides: CatalogueOverrides = {}): CatalogueCarInput {
    const brand = firstMatch(BRAND_ALIASES, v.make) ?? v.make?.trim().toUpperCase() ?? '';
    const year = v.year ? String(v.year) : '';
    const fallbackTitle = [year, brand, v.model, v.trim].filter(Boolean).join(' ');

    // Images in source order, and only ones that actually reached Cloudinary
    // and belong to this vehicle.
    const carImages = [...v.images]
      .filter((img) => img.sourceId === v.sourceId && img.secureUrl)
      .sort((a, b) => a.order - b.order)
      .map((img) => img.secureUrl!);

    return {
      importSource: this.importSource,
      importId: v.sourceId,
      carTitle: overrides.carTitle?.trim() || fallbackTitle,
      carBrand: brand,
      carModel: v.model,
      carVin: asVin(v.plateOrVin),
      carType: overrides.carType || undefined,
      // CKAuto sells insurance salvage (전손/분손/침수): damaged unless the admin says otherwise.
      carCondition: overrides.carCondition || 'DAMAGED',
      carFuel: firstMatch(FUEL_RULES, v.fuelType) ?? (v.fuelType ? 'OTHER' : undefined),
      carTransmission: firstMatch(TRANSMISSION_RULES, v.transmission),
      carYear: year,
      carMileage: v.mileageKm as number,
      carPrice: v.priceKrw !== undefined ? String(v.priceKrw) : '',
      carColor: firstMatch(COLOR_ALIASES, v.color) ?? v.color,
      carDesc: overrides.carDesc?.trim() || undefined,
      carImages,
    };
  }

  /** What would stop the catalogue accepting this car, checked before the call. */
  missingFields(input: CatalogueCarInput): string[] {
    const missing: string[] = [];
    if (!input.carBrand) missing.push('make');
    if (!input.carYear) missing.push('year');
    if (!input.carTitle) missing.push('carTitle');
    if (input.carMileage === undefined || input.carMileage === null) missing.push('mileageKm');
    if (!input.carPrice) missing.push('priceKrw');
    if (!input.carImages.length) missing.push('images (none uploaded to Cloudinary)');
    return missing;
  }

  /** Returns the catalogue car's id. Throws CataloguePublishError on any failure. */
  async publish(input: CatalogueCarInput): Promise<string> {
    const missing = this.missingFields(input);
    if (missing.length) {
      throw new CataloguePublishError(`Missing: ${missing.join(', ')}`, 'invalid', missing);
    }

    const base = this.config.get<string>('CATALOGUE_API_URL');
    const token = this.config.get<string>('CATALOGUE_IMPORT_TOKEN');
    if (!base || !token) {
      throw new CataloguePublishError(
        'CATALOGUE_API_URL / CATALOGUE_IMPORT_TOKEN are not set',
        'unavailable',
      );
    }

    let res;
    try {
      res = await request(new URL('/internal/car/import', base).toString(), {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify(input),
        headersTimeout: 15_000,
        bodyTimeout: 15_000,
      });
    } catch (err) {
      throw new CataloguePublishError(
        `Catalogue unreachable: ${(err as Error).message}`,
        'unavailable',
      );
    }

    const body = (await res.body.json().catch(() => ({}))) as Record<string, any>;
    if (res.statusCode === 200 || res.statusCode === 201) {
      const id = body?.data?._id;
      if (!id) throw new CataloguePublishError('Catalogue answered without a car id', 'unavailable');
      this.log.log(
        `${input.importId} -> catalogue car ${id} (${body.created ? 'created' : 'already existed'})`,
      );
      return String(id);
    }

    const message = body?.message ?? `Catalogue returned ${res.statusCode}`;
    const kind = res.statusCode === 400 ? 'invalid' : 'unavailable';
    throw new CataloguePublishError(message, kind, body?.problems ?? []);
  }

  private get importSource(): string {
    return this.config.get<string>('CATALOGUE_IMPORT_SOURCE') ?? 'ckauto';
  }
}
