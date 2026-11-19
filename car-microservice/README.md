# auto-auction

A Telegram bot that imports CKAuto cars **one at a time, chosen by an admin**,
into the after-auction platform and posts each one to the Telegram channel.
Standalone NestJS microservice.

Until 2026-11-19 this service fetched and processed every CKAuto lot daily.
That cost hours and thousands of photo uploads for cars nobody had picked, so
it was replaced by this bot.

## Flow

```
 admin -> bot:  https://ckauto.co.kr/auction?v=261119G020
                30000-38000          (estimated price, USD)
                qora                 (colour, optional)
        |
   [1] fetch      SourceClientService   stream CKAuto's snapshot, stop at the lot
   [2] store raw  raw_listings          verbatim payload + sha256 hash
   [3] normalise  normalizer.ts         field mapping, sourceId resolved first
        |         ImageService          Cloudinary, one folder per sourceId
        v
 bot -> admin:  the channel post as it will look  [✅ Publish] [✏️ Edit name] [❌ Cancel]
        |
   Publish:  USD -> KRW at the site's own rate
             POST auction /internal/car/import   -> car on the site (status: approved)
             album + caption to TELEGRAM_CHANNEL_ID, linking SITE_URL/products/<id>
```

- Only users in `TELEGRAM_ADMIN_IDS` get answers (falls back to
  `TELEGRAM_CHAT_ID`); everyone else is ignored silently.
- The car's name is translated from CKAuto's Korean (`catalogue/model-names.ts`).
  Words it cannot translate are left out and the preview warns, so Korean never
  reaches the site or the channel. **✏️ Edit name** replaces it.
- The site gets the price as a KRW range; the channel shows the USD range as
  typed. The CKAuto auction end time is in the channel post only (Tashkent time),
  never on the site.
- Sending a published lot again returns its site and channel links instead of
  creating a duplicate. If the site accepted the car but the channel post failed
  (e.g. the bot is not a channel admin), the bot offers **🔁 Retry channel post**.
- Wording of the channel post: `src/bot/caption.ts`.

## Not mixing up cars

The one failure mode that would really hurt is a photo or a spec landing on
the wrong vehicle. Three things prevent it:

1. `normalise()` resolves `sourceId` before anything else and throws if it is
   missing. No id, no record.
2. Images are stamped with that `sourceId` while still inside the same source
   object. Nothing is ever zipped together by array index afterwards.
3. Cloudinary assets live at `ckauto/<sourceId>/<sourceId>_<hash of photo URL>`,
   so the storage path itself identifies the car. The name is never the photo's
   position: uploads use `overwrite: false`, and on a name clash Cloudinary
   silently returns the asset already there, so position-based names would hand
   back an old photo when CKAuto inserts a new first one. `ImageService` also
   re-checks the id and throws on a mismatch.

Plus `raw_listings` keeps the original payload, so any record can be audited
against exactly what the source sent.

## The source

Full reference: [docs/ckauto-api.md](docs/ckauto-api.md). In short:

- Login is a cookie session: `POST /api/auth/login` with `loginId`/`password`,
  exactly as CKAuto's own frontend sends it. `npm run check:login` tries it once.
- `GET /api/app/state` returns the **whole dataset** (~18 MB, ~13k vehicles, no
  pagination, no per-lot endpoint). An import streams it and stops as soon as
  it reaches the requested lot, so expect ~10-30 s per car including photos.
- Logged out, the same call still answers - with 271 rows and 16 of 30 fields.
  The client checks the first record and aborts rather than use that view.
- Photos are static files (`photoFiles` paths), no auth needed.
- `highestBidder` (real member names) and `isMyBid` are stripped before
  anything is stored, the raw audit copy included.
- There is **no price** and **no colour** in the source; the admin gives both
  to the bot. Cars default to `DAMAGED` (insurance salvage).

## Running

```bash
cp .env.example .env    # fill it in
npm install
docker compose up -d    # mongo, if you are not using a hosted one
npm test                # unit tests: normaliser, catalogue mapping, bot parsing/caption, config check
npm run start:dev       # service + Telegram bot
```

Startup checks the configuration and refuses to boot with a list of every
missing setting (MongoDB, CKAuto login, Cloudinary, bot token, channel,
catalogue URL/token, site URL).

`GET /health` is public: `{status, mongo, bot}`. 503 only when MongoDB is down;
`bot: false` means polling stopped (see the log - usually another program
polling the same bot token). The Dockerfile healthcheck uses it.

Run **one** instance: Telegram lets only one program poll a bot at a time.

## Admin API

Used by the admin panel's Imports page, which lists what the bot fetched.

| Method | Path                                | Purpose                      |
|--------|-------------------------------------|------------------------------|
| GET    | `/admin/vehicles?status=pending`    | fetched, not yet published   |
| GET    | `/admin/vehicles/:sourceId`         | one car, all images          |
| POST   | `/admin/vehicles/:sourceId/approve` | fix fields, publish to catalogue (no channel post) |
| POST   | `/admin/vehicles/:sourceId/reject`  | reject (409 if already published) |

All of these sit behind `AdminTokenGuard`: send `Authorization: Bearer $ADMIN_API_TOKEN`.
The guard fails closed - if `ADMIN_API_TOKEN` is unset or under 16 characters it
logs an error at startup and rejects every request. Comparison is constant-time.

## Publishing to the catalogue

The car is POSTed to the auction backend's `/internal/car/import` (bearer
`CATALOGUE_IMPORT_TOKEN`, which must equal the backend's `IMPORT_API_TOKEN`).
The vehicle only becomes `approved` once the catalogue accepts it, so
`approved` always means "is in the catalogue" and carries `catalogueCarId`.

- On failure `publishError` is set and the bot (or the API: 400/502) says why -
  e.g. a brand/year/title clash with an existing car: change the name.
- The import is idempotent on `(importSource, importId)`: retrying can never
  list the same car twice.
- Korean source values are mapped to catalogue enums in
  `catalogue.service.ts` (fuel, transmission, brand, colour). A 17-char VIN
  becomes `carVin`; a Korean plate number is not treated as one.
