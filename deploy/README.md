# Deploying Auto Auction

Everything runs on the Hostinger VPS (`ssh hm`, 45.93.139.49) in `/opt/auto-auction`,
as one Docker Compose project named `auto-auction`:

| service | what | reached at |
|---|---|---|
| `web` | React site + SEO server (`auction-react/server`) | autoauction.kr |
| `api` | backend + admin panel (`auction`) | ziyo.autoauction.kr |
| `bot` | Telegram import bot (`car-microservice`) | Telegram only |
| `tunnel` | Cloudflare Tunnel, carries the two domains in | — |
| `mongo` | MongoDB 7: databases `Auction` (site) and `ckauto-bot` (bot) | containers only |

Photos are on Cloudinary. The database runs here, next to the API, because
MongoDB Atlas sat in Seoul and every query from this server (Vilnius) cost
~280 ms. Atlas still holds a copy from the 2026-11-19 move, but it is no
longer updated.

## Backups

`deploy/backup.sh` dumps the whole database every night at 03:30 (server time)
to `/opt/auto-auction/backups/` and keeps 14 days (cron: `/etc/cron.d/auto-auction-backup`,
log: `/var/log/auto-auction-backup.log`). The restore command is at the top of
the script. Keep a copy somewhere other than this server too - e.g. now and then
`scp hm:/opt/auto-auction/backups/<date>.archive.gz .`.

The same server also runs the unrelated **hm** project (`/opt/hm`, ports 80/443).
Never stop or edit it from here.

## Secrets (in `/opt/auto-auction/deploy`, not in git)

- `.env` with `TUNNEL_TOKEN=` (Cloudflare Zero Trust → Networks → Tunnels → auto-auction;
  set it with `aa-set-token`) and `MONGO_ROOT_PASSWORD=`
- `api.env`: the backend's variables (`MONGO_URL`, `SECRET_TOKEN`, `SESSION_SECRET`,
  `CORS_ORIGIN`, `CLOUDINARY_URL`, `IMPORT_API_TOKEN`, ...)
- `bot.env`: car-microservice's variables. `CATALOGUE_IMPORT_TOKEN` must equal the
  backend's `IMPORT_API_TOKEN`.

## Everyday commands

```bash
ssh hm
cd /opt/auto-auction/deploy

docker compose ps                      # what is running, health
docker compose logs -f --tail=100 bot  # follow one service (api, web, bot, tunnel)
docker compose restart bot             # restart one service

# deploy a new version
cd /opt/auto-auction && git pull && cd deploy && docker compose up -d --build
```

Run the bot in **one** place only: Telegram allows one program to read a bot's
messages, so a second copy (e.g. on a laptop) stops one of them with a 409 error.
