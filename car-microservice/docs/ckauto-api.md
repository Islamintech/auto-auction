# CKAuto Auction — API reference for the `auto-auction` ingestion service

Captured 2026-11-12 from ckauto.co.kr in your Chrome (your partner session was already
signed in as 지요 — I entered no password and copied no cookie or session value).

**Headline: you don't need Playwright.** The site is a React SPA on a JSON API, and the
entire vehicle dataset comes from one endpoint.

---

## 1. Endpoints

| Route | Method | Auth | Notes |
|---|---|---|---|
| `/api/app/state` | GET | optional | **The one you need.** Whole dataset in one response. |
| `/api/app/popular-search-tags?limit=8` | GET | no | Search tag chips |
| `/api/app/popup` | GET | no | Homepage banner |
| `/api/health` | GET | no | Liveness |
| `/api/auth/csrf` | GET | no | CSRF pre-flight |
| `/api/auth/login` | POST | no | Session login |
| `/api/auth/me`, `/logout`, `/signup`, `/find-id`, `/reset-password`, `/change-password` | — | mixed | Account |
| `/api/bids`, `/api/bids/cancel` | POST | yes | Bidding |
| `/api/vehicles`, `/api/vehicles/:id`, `/api/engines`, `/api/engines/:id`, `/api/address`, `/api/members` | — | yes (401 anon) | Admin/back-office |
| `/api/app/vehicles`, `/api/app/auction-photos`, `/api/app/activity-logs`, `/api/app/search-logs`, `/api/app/excel-register-draft` | POST | yes | Admin write paths (404 on GET) |

There is **no detail endpoint** for the public listing view and **no pagination,
filtering or `?page=` support** on `/api/app/state`. Everything is in the single blob.

## 2. Auth

Cookie session, not a bearer token:

1. `GET /api/auth/csrf`
2. `POST /api/auth/login` with `credentials: 'include'` and the CSRF value in an
   `X-CSRF-Token` header. Body keys in the bundle are `loginId` + password field.
3. Session cookie persists; `GET /api/auth/me` validates it.

In NestJS use a cookie jar (`tough-cookie` + `axios-cookiejar-support`, or `fetch` with
a manual `Cookie` header), refresh CSRF per login, and re-login on a 401.

**Auth changes the payload — this matters a lot:**

| | anonymous | authenticated |
|---|---|---|
| vehicles returned | 271 (live only) | **13,332 (full history)** |
| fields per vehicle | 16 | **30** |
| extra top-level keys | — | `favorites` |

So log in. Anonymous gives you less than a third of the fields and 2% of the rows.

## 3. Response shape

```jsonc
{
  "ok": true,
  "vehicles": [ /* 13,332 objects, see §4 */ ],
  "popup": { "enabled": false, "content": "", "imageName": "", "imageUrl": "" },
  "favorites": { /* account-scoped */ }
}
```

Size: **~18 MB** uncompressed JSON (8.6 MB of it is `photoFiles`, 1.5 MB is `memo`).
No ETag-based conditional fetch worth relying on — treat each call as a full snapshot.

`status` distribution right now: `공매진행` 274 · `낙찰대기` 13,057 · `낙찰` 1.
`createdAt` oldest is `2026-07-31 11:48`, so the dataset starts there.

## 4. Vehicle record

Sample live listing (photos truncated):

```json
{
  "code": "261113E010",
  "insurer": "히어로손해사정",
  "manufacturer": "KGM(쌍용)",
  "model": "코란도",
  "modelName": "뉴 스타일 코란도 C C200 (17-19)",
  "grade": "2.2 디젤",
  "yearMonth": "2017년 10월",
  "yard": "경기도 고양시",
  "process": "폐차",
  "progressMethod": "전손",
  "status": "공매진행",
  "transmission": "오토",
  "fuel": "디젤",
  "mileage": "37,914",
  "auctionEnd": "2026-11-13 13:00",
  "photoFiles": ["/legacy/assets/auction-photos/261113E010-1.jpg", "…"],
  "engineType": "672950",
  "displacement": "2157",
  "inspectionDate": "2025-11-19",
  "currentMileage": "1,111,111",
  "commission": "5%",
  "cost": "",
  "memo": "연식:2018/최초등록일:2017.10.16",
  "currentBid": "",
  "highestBidder": "",
  "lastBidAt": "",
  "documentFeeType": "",
  "documentFee": "",
  "createdAt": "2026-11-12 11:19",
  "isMyBid": false
}
```

Every field is present on every record (no missing keys) — absence is `""`.
**Everything is a string** except `photoFiles` (array), `isMyBid` (boolean) and
`currentBid` (string *or* number — inconsistent).

| field | empty % | distinct | notes |
|---|---|---|---|
| `code` | 0 | 13,332 | Unique. `YYMMDD` + letter + 3 digits → use as external ID |
| `insurer` | 0 | 10 | Closed enum (see below) |
| `manufacturer` | 0 | 45 | `현대`, `KGM(쌍용)`, `르노(삼성)`, `쉐보레(GM대우)` … |
| `model` | 0.1 | 627 | |
| `modelName` | 8.5 | 781 | Generation + year range, e.g. `ES 6세대 (12-18)` |
| `grade` | 12.3 | 1,038 | Trim, e.g. `2.2 디젤` |
| `yearMonth` | 0 | 310 | `"2017년 10월"` — parse, don't store raw |
| `yard` | 0.1 | 584 | Korean admin region, `시/군/구` level |
| `process` | 0 | 12 | Dirty — see §5 |
| `progressMethod` | 0 | 6 | Dirty — see §5 |
| `status` | 0 | 3 | `공매진행` / `낙찰대기` / `낙찰` |
| `transmission` | 0 | 4 | `오토` 120 · `자동` 140 · `수동` 4 · `매뉴얼` 7 — synonyms |
| `fuel` | 0 | 6 | `가솔린` `디젤` `하이브리드` `전기` `LPG` `EV` — `전기`/`EV` dup |
| `mileage` | low | — | `"37,914"` comma-formatted km |
| `currentMileage` | 13.5 | 5,519 | Same format; placeholder junk like `1,111,111` |
| `auctionEnd` | 0 | 1,024 | `"2026-11-13 13:00"` KST, no offset |
| `createdAt` | 0 | 4,384 | Same format |
| `photoFiles` | — | — | 0–138 images, avg 11.8; **2,851 records have zero** |
| `engineType` | 0.8 | 722 | Engine code, e.g. `G4FD`, `2AR` |
| `displacement` | 13 | 350 | cc as string, e.g. `2157` |
| `inspectionDate` | 1 | 1,333 | `YYYY-MM-DD` |
| `commission` | 0 | 2 | **`"5%"` or `"0.05"`** — two formats for one value |
| `cost` | 10.2 | 1,221 | `"300,000"` KRW |
| `memo` | 1.5 | 12,927 | Freeform; often `연식:2018/최초등록일:2017.10.16` or damage text |
| `currentBid` | 93.2 | 373 | string\|number |
| `highestBidder` | 93.2 | 26 | **Real member names — PII, do not ingest** |
| `lastBidAt` | 93.2 | 806 | |
| `documentFeeType` | 93.2 | 2 | `폐차` / `이전` |
| `documentFee` | 93.2 | 2 | `100000` / `300000` |
| `isMyBid` | 0 | — | Account-scoped, not vehicle data |

Enums worth hard-coding:

- `insurer`: 히어로손해사정, KB손해보험, 메리츠화재, 하나손해보험, 삼성화재, 현대해상, 한화손보, 렌터카공제회, SK렌터카, DB손해보험
- `progressMethod` (valid): 전손, 분손, 침수
- `process` (valid): 폐차, 이전, 이전+폐차, 배터리, 단품, 단품매각, 전기차배터리, 타사전손

## 5. Data-quality traps

1. **Column-shift junk in legacy rows.** `process` contains `"n? 2n26_11-( "` and
   `"이동보관요청, 무"`; `progressMethod` contains `"2026-11- -0?"`, and also
   `폐차`/`이전` (which belong in `process`). Validate against the enum and route
   unknown values to manual review rather than failing the row.
2. **Synonym pairs.** `오토`≡`자동`, `수동`≡`매뉴얼`, `전기`≡`EV`. Normalize.
3. **`commission` has two encodings** (`"5%"` vs `"0.05"`). Parse both.
4. **Placeholder mileages** (`1,111,111`, `100,000` round numbers). Sanity-cap.
5. **21% of records have no photos** — your "at least 10 images" rule will reject many
   of the `낙찰대기` backlog. Live `공매진행` rows are much better populated.
6. `auctionEnd` / `createdAt` carry no timezone — they are KST (UTC+9). Attach the zone
   explicitly before storing, or you'll be 9 hours off.

## 6. Images

Static, **no auth required**, served directly:

```
https://ckauto.co.kr/legacy/assets/auction-photos/261113E010-1.jpg
```

`photoFiles` holds root-relative paths — just prefix the origin. Naming is
`{code}-{n}.jpg`, occasionally with a cache-busting suffix
(`261112G010-1-1794376699220.jpg`), so always use the array, never reconstruct names.
Download concurrency-limited and push straight to Cloudinary.

## 7. Suggested ingestion shape

Since there's no pagination or incremental filter, a full-snapshot diff is the natural
design and fits your daily-batch plan:

1. Login → `GET /api/app/state` (stream-parse; 18 MB is too big to `JSON.parse` casually
   under memory pressure — `stream-json` or `JSONStream` over the `vehicles` array).
2. Filter `status === '공매진행'` (274 rows) for the approval queue; optionally keep
   `낙찰대기` as a cold archive.
3. Upsert by `code`. New codes → Telegram notification for admin approval.
4. Fetch images only for newly approved codes.
5. Drop `highestBidder` and `isMyBid`. `currentBid` / `lastBidAt` are useful as
   market-price signals if you want them.

A second lighter poll during the day is cheap in rows but not in bytes — if you want
near-real-time new listings, poll and diff on `createdAt` > last-seen, accepting the
18 MB transfer each time. There's no cheaper way with this API.

## 8. Draft `FIELD_MAP`

```ts
// src/sources/ckauto/field-map.ts
const commaInt = (s?: string) => {
  const n = Number(String(s ?? '').replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
};

const TRANSMISSION = { 오토: 'AUTO', 자동: 'AUTO', 수동: 'MANUAL', 매뉴얼: 'MANUAL' } as const;
const FUEL = {
  가솔린: 'GASOLINE', 디젤: 'DIESEL', 하이브리드: 'HYBRID',
  전기: 'ELECTRIC', EV: 'ELECTRIC', LPG: 'LPG',
} as const;
const DAMAGE = { 전손: 'TOTAL_LOSS', 분손: 'PARTIAL_LOSS', 침수: 'FLOOD' } as const;
const PROCESS = {
  폐차: 'SCRAP', 이전: 'TRANSFER', '이전+폐차': 'TRANSFER_OR_SCRAP',
  배터리: 'BATTERY', 전기차배터리: 'EV_BATTERY',
  단품: 'PARTS', 단품매각: 'PARTS_SALE', 타사전손: 'THIRD_PARTY_TOTAL_LOSS',
} as const;
const STATUS = { 공매진행: 'LIVE', 낙찰대기: 'PENDING_AWARD', 낙찰: 'AWARDED' } as const;

const kst = (s?: string) =>
  s ? new Date(`${s.replace(' ', 'T')}:00+09:00`) : null;          // "2026-11-13 13:00"

const yearMonth = (s?: string) => {
  const m = /(\d{4})년\s*(\d{1,2})월/.exec(s ?? '');
  return m ? { year: +m[1], month: +m[2] } : { year: null, month: null };
};

const commission = (s?: string) => {
  const v = String(s ?? '').trim();
  if (v.endsWith('%')) return parseFloat(v) / 100;
  const n = parseFloat(v);
  return Number.isFinite(n) ? (n > 1 ? n / 100 : n) : null;
};

export const FIELD_MAP = {
  externalId:     (v: CkRaw) => v.code,
  sourceUrl:      (v: CkRaw) => `https://ckauto.co.kr/`,          // no per-lot URL exists
  insurer:        (v: CkRaw) => v.insurer || null,
  make:           (v: CkRaw) => v.manufacturer || null,
  model:          (v: CkRaw) => v.model || null,
  modelName:      (v: CkRaw) => v.modelName || null,
  trim:           (v: CkRaw) => v.grade || null,
  year:           (v: CkRaw) => yearMonth(v.yearMonth).year,
  month:          (v: CkRaw) => yearMonth(v.yearMonth).month,
  location:       (v: CkRaw) => v.yard || null,
  disposalType:   (v: CkRaw) => PROCESS[v.process] ?? 'UNKNOWN',   // flag for review
  damageType:     (v: CkRaw) => DAMAGE[v.progressMethod] ?? 'UNKNOWN',
  status:         (v: CkRaw) => STATUS[v.status] ?? 'UNKNOWN',
  transmission:   (v: CkRaw) => TRANSMISSION[v.transmission] ?? null,
  fuel:           (v: CkRaw) => FUEL[v.fuel] ?? null,
  mileageKm:      (v: CkRaw) => commaInt(v.currentMileage) ?? commaInt(v.mileage),
  engineCode:     (v: CkRaw) => v.engineType || null,
  displacementCc: (v: CkRaw) => commaInt(v.displacement),
  inspectionDate: (v: CkRaw) => (v.inspectionDate ? new Date(v.inspectionDate) : null),
  auctionEndsAt:  (v: CkRaw) => kst(v.auctionEnd),
  listedAt:       (v: CkRaw) => kst(v.createdAt),
  commissionRate: (v: CkRaw) => commission(v.commission),
  costKrw:        (v: CkRaw) => commaInt(v.cost),
  documentFeeKrw: (v: CkRaw) => commaInt(v.documentFee),
  documentFeeFor: (v: CkRaw) => PROCESS[v.documentFeeType] ?? null,
  currentBidKrw:  (v: CkRaw) => commaInt(String(v.currentBid)),
  lastBidAt:      (v: CkRaw) => kst(v.lastBidAt),
  notes:          (v: CkRaw) => v.memo || null,
  images:         (v: CkRaw) =>
    (v.photoFiles ?? []).map((p) => `https://ckauto.co.kr${p}`),
  // deliberately NOT mapped: highestBidder (PII), isMyBid, favorites
} satisfies Record<string, (v: CkRaw) => unknown>;
```

`mileage` vs `currentMileage`: `currentMileage` is the odometer reading at intake and is
13.5% empty; `mileage` is populated far more reliably. The map above prefers
`currentMileage` and falls back — swap the order if you find the opposite in spot checks.
