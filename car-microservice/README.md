# auto-auction

Daily ingestion of CKAuto vehicle listings into the after-auction platform.
Standalone NestJS microservice.

## Pipeline

```
  CKAuto JSON API
        |
   [1] fetch      SourceClientService   own partner account, 1 req at a time
        |
   [2] store raw  raw_listings          verbatim payload + sha256 hash
        |
   [3] diff       payloadHash compare   unchanged listings stop here
        |
   [4] normalise  normalizer.ts         field mapping, sourceId resolved first
        |         ImageService          Cloudinary, one folder per sourceId
        v
   vehicles (status: pending)
        |
   TelegramService  -->  "5 new cars"  -->  admin panel link
        |
   admin approves  -->  POST auction /internal/car/import  -->  status: approved
```

## Not mixing up cars

The one failure mode that would really hurt is a photo or a spec landing on
the wrong vehicle. Three things prevent it:

1. `normalise()` resolves `sourceId` before anything else and throws if it is
   missing. No id, no record.
2. Images are stamped with that `sourceId` while still inside the same source
   object. Nothing is ever zipped together by array index afterwards.
3. Cloudinary assets live at `ckauto/<sourceId>/<sourceId>_00`, so the storage
   path itself identifies the car. `ImageService` also re-checks the id and
   throws on a mismatch.

Plus `raw_listings` keeps the original payload, so any record can be audited
against exactly what the source sent.

## The source

Full reference: [docs/ckauto-api.md](docs/ckauto-api.md). In short:

- Login is a cookie session: `GET /api/auth/csrf`, then `POST /api/auth/login`
  with `loginId`/`password` and an `X-CSRF-Token` header.
- `GET /api/app/state` returns the **whole dataset** (~18 MB, ~13k vehicles, no
  pagination). Every run is a full snapshot, stream-parsed, filtered to
  `INGEST_STATUSES` plus vehicles we already track, then diffed on `code`.
- Logged out, the same call still answers - with 271 rows and 16 of 30 fields.
  The client checks the first record and aborts the run rather than ingest
  that reduced view.
- Photos are static files (`photoFiles` paths), no auth needed.
- `highestBidder` (real member names) and `isMyBid` are stripped before
  anything is stored, the raw audit copy included.
- There is **no price** in the source - it is an auction. The admin sets
  `priceKrw` at approval. Cars default to `DAMAGED` (insurance salvage).
- Junk in legacy rows (column-shifted `process`/`progressMethod`, placeholder
  mileages like 1,111,111) never fails a row: the value becomes `UNKNOWN` or
  empty and is listed in the vehicle's `needsReview`.

First run on a fresh database copies photos for every live lot: roughly
274 lots x up to `MAX_IMAGES_PER_VEHICLE` photos at `REQUEST_DELAY_MS` each,
so expect an hour or more. Later runs only fetch photos for new lots.

## Running

```bash
cp .env.example .env    # fill it in
npm install
docker compose up -d    # mongo + redis, if you are not using hosted ones
npm run ingest:once     # single run, no scheduler
npm run start:dev       # service + daily cron at 04:00 KST
```

## Admin API

| Method | Path                                | Purpose                      |
|--------|-------------------------------------|------------------------------|
| GET    | `/admin/vehicles?status=pending`    | review queue                 |
| GET    | `/admin/vehicles/:sourceId`         | one car, all images          |
| POST   | `/admin/vehicles/:sourceId/approve` | fix fields, publish to catalogue |
| POST   | `/admin/vehicles/:sourceId/reject`  | reject (409 if already published) |
| POST   | `/admin/vehicles/run-now`           | queue a run immediately      |

All of these sit behind `AdminTokenGuard`: send `Authorization: Bearer $ADMIN_API_TOKEN`.
The guard fails closed - if `ADMIN_API_TOKEN` is unset or under 16 characters it
logs an error at startup and rejects every request, so a missing `.env` cannot
quietly leave approve/reject open. Comparison is constant-time.

```bash
curl -H "Authorization: Bearer $ADMIN_API_TOKEN" \n  http://localhost:3100/admin/vehicles?status=pending
```

## Deliberate choices

- **Polite by default.** `REQUEST_DELAY_MS` between every request, worker
  concurrency 1. It is a daily batch; there is no reason to go fast, and a
  steady trickle keeps our traffic unremarkable in their logs.
- **Telegram notifies, it does not review.** Judging ten photos inside a chat
  window is miserable. The bot sends a count and a link.
- **Images are fetched only for genuinely new or changed listings.** The hash
  check in stage 3 means a normal day costs almost nothing.

## Publishing to the catalogue

Approve does two things in order: saves the admin's corrections, then POSTs the
car to the auction backend's `/internal/car/import` (bearer
`CATALOGUE_IMPORT_TOKEN`, which must equal the backend's `IMPORT_API_TOKEN`).
The vehicle only becomes `approved` once the catalogue accepts it, so
`approved` always means "is in the catalogue" and carries `catalogueCarId`.

- Approve body: any of `make model trim year mileageKm priceKrw fuelType
  transmission color plateOrVin grade` (corrections), plus catalogue-only
  `carTitle carType carCondition carDesc`. Nothing else is writable.
- `GET /admin/vehicles/:sourceId` returns `cataloguePreview` (exactly what
  approve would send) and `missing` (what would block it).
- On failure the corrections are kept, `publishError` is set, and the answer
  is 400 (fix the data - e.g. missing price, or a brand/year/title clash with
  an existing car: change `carTitle`) or 502 (catalogue down/misconfigured).
- The import is idempotent on `(importSource, importId)`: retrying an approve
  can never list the same car twice.
- Korean source values are mapped to catalogue enums in
  `catalogue.service.ts` (fuel, transmission, brand, colour). A 17-char VIN
  becomes `carVin`; a Korean plate number is not treated as one.
