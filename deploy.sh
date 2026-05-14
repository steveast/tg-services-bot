#!/usr/bin/env bash
# Deploy tg-services-bot to production.
# Usage: ./deploy.sh
set -euo pipefail

SERVER="ms@176.98.191.90"
REMOTE_DIR="/home/ms/tg-services-bot"
PM2_NAME="tg-services-bot"
LOCAL_DIR="$(cd "$(dirname "$0")" && pwd)"

log() { echo -e "\n\033[1;36m▶ $*\033[0m"; }

log "Local typecheck"
( cd "$LOCAL_DIR" && npm run typecheck )

log "Rsync → $SERVER:$REMOTE_DIR"
rsync -avz --delete \
  --exclude node_modules \
  --exclude dist \
  --exclude .git \
  --exclude '*.db' \
  --exclude '*.db-*' \
  "$LOCAL_DIR/" "$SERVER:$REMOTE_DIR/"

log "Remote: install + build + reload"
ssh "$SERVER" bash -se <<EOF
set -euo pipefail
cd "$REMOTE_DIR"
chmod 600 .env
npm ci --no-audit --no-fund
npm run build
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save
EOF

log "Status"
ssh "$SERVER" "pm2 list | sed -n '1,3p;/$PM2_NAME/p'"

log "Recent logs"
ssh "$SERVER" "pm2 logs $PM2_NAME --lines 15 --nostream 2>&1 | tail -20"

log "Done."
