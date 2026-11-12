# Auto Auction

One repository for the whole platform.

| Folder | What it is | Stack | Deploys to |
|---|---|---|---|
| [`auction/`](auction) | API + admin panel (EJS) | Express, TypeScript, MongoDB | Railway (Dockerfile) |
| [`auction-react/`](auction-react) | Public website | React (CRA), TypeScript | Vercel |
| [`car-microservice/`](car-microservice) | Daily CKAuto ingestion, review queue | NestJS, MongoDB, Redis/BullMQ | — not deployed yet |

Each folder is a self-contained app with its own `package.json`, `.env.example`
and README. Install and run them from inside their folder.

## How they connect

```
CKAuto  ->  car-microservice  --(admin approves)-->  POST auction /internal/car/import
                                                          |
                                     auction-react  <--  auction public API
```

`car-microservice` sends approved cars to the backend with a shared token:
`CATALOGUE_IMPORT_TOKEN` (microservice) must equal `IMPORT_API_TOKEN` (auction).

## History

`auction` and `auction-react` were separate repositories until 2026-11-12. Their
full histories were merged in under their folders; to follow a file across the
move use `git log --follow`, or look at the commits reachable from the
"Import ..." merge commits.

## Deploying from this repo

Hosting has to point at the right folder:

- Railway (auction): service Settings -> Root Directory = `auction`
- Vercel (auction-react): Project Settings -> Root Directory = `auction-react`

Optionally set Railway's Watch Paths (`/auction/**`) and Vercel's Ignored Build Step
so a change in one app does not redeploy the other.
