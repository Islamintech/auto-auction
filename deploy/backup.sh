#!/bin/bash
# Daily backup of the Auto Auction database (all databases in the `mongo`
# container) to /opt/auto-auction/backups/YYYY-MM-DD.archive.gz.
# Keeps the last 14 days. Run by /etc/cron.d/auto-auction-backup.
#
# Restore one backup (replaces what is in the database):
#   cd /opt/auto-auction/deploy && set -a && . ./.env && set +a
#   docker compose exec -T mongo mongorestore -u root -p "$MONGO_ROOT_PASSWORD" \
#     --authenticationDatabase admin --archive --gzip --drop < ../backups/2026-11-20.archive.gz
set -euo pipefail

cd "$(dirname "$0")"
set -a; . ./.env; set +a

DIR=../backups
mkdir -p "$DIR"
OUT="$DIR/$(date +%F).archive.gz"

docker compose exec -T mongo mongodump -u root -p "$MONGO_ROOT_PASSWORD" \
  --authenticationDatabase admin --archive --gzip --quiet > "$OUT.tmp"
mv "$OUT.tmp" "$OUT"
chmod 600 "$OUT"

find "$DIR" -name '*.archive.gz' -mtime +14 -delete
echo "$(date -Is) backup ok: $OUT ($(du -h "$OUT" | cut -f1))"
