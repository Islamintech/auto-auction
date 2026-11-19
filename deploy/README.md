# Deploying Auto Auction

Everything runs on the Hostinger VPS (`ssh hm`, 45.93.139.49) in `/opt/auto-auction`,
as one Docker Compose project named `auto-auction`:

| service | what | reached at |
|---|---|---|
| `web` | React site + SEO server (`auction-react/server`) | autoauction.kr |
| `api` | backend + admin panel (`auction`) | ziyo.autoauction.kr |
| `bot` | Telegram import bot (`car-microservice`) | Telegram only |
| `tunnel` | Cloudflare Tunnel, carries the two domains in | — |

The database is MongoDB Atlas; photos are on Cloudinary. Nothing on the VPS
needs a backup except the three secret files below.

The same server also runs the unrelated **hm** project (`/opt/hm`, ports 80/443).
Never stop or edit it from here.

## Secrets (in `/opt/auto-auction/deploy`, not in git)

- `.env` with `TUNNEL_TOKEN=` (Cloudflare Zero Trust → Networks → Tunnels → auto-auction)
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
