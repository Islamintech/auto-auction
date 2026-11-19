# Auto Auction

One repository for the whole platform.

| Folder | What it is | Stack |
|---|---|---|
| [`auction/`](auction) | API + admin panel (EJS), ziyo.autoauction.kr | Express, TypeScript, MongoDB |
| [`auction-react/`](auction-react) | Public website, autoauction.kr (+ SEO server in `server/`) | React (CRA), TypeScript |
| [`car-microservice/`](car-microservice) | Telegram bot: imports chosen CKAuto cars to the site and the channel | NestJS, MongoDB |
| [`deploy/`](deploy) | Docker Compose for the VPS | Docker, Cloudflare Tunnel |

Each app folder is self-contained with its own `package.json`, `.env.example`
and README. Install and run them from inside their folder.

## How they connect

```
admin -> Telegram bot (car-microservice) -> CKAuto lot -> POST auction /internal/car/import
                                         -> post in the Telegram channel
                                                          |
                            auction-react (web)  <--  auction public API
```

`car-microservice` sends cars to the backend with a shared token:
`CATALOGUE_IMPORT_TOKEN` (microservice) must equal `IMPORT_API_TOKEN` (auction).

## Hosting

Since 2026-11-19 everything runs on the Hostinger VPS with Docker Compose behind
a Cloudflare Tunnel; see [deploy/README.md](deploy/README.md). (Railway and
Vercel were used before that.) The database is MongoDB Atlas, images are on
Cloudinary.

## History

`auction` and `auction-react` were separate repositories until 2026-11-12. Their
full histories were merged in under their folders; to follow a file across the
move use `git log --follow`, or look at the commits reachable from the
"Import ..." merge commits.
