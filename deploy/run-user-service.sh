#!/bin/sh
# Run without root. A single lock covers all cron and manual starts.
set -eu
umask 077
APP_ROOT="${MAGIC_SIEGE_ROOT:-$HOME/apps/magic-siege-skill5}"
mkdir -p "$APP_ROOT/shared/data" "$APP_ROOT/shared/logs" "$APP_ROOT/shared/runtime"
exec 9>"$APP_ROOT/shared/runtime/service.lock"
flock -n 9 || exit 0
cd "$APP_ROOT/current"
export HOST="${HOST:-0.0.0.0}"
export PORT="${PORT:-5183}"
export KC_DATA_DIR="$APP_ROOT/shared/data"
export MAGIC_UPDATE_DIR="$APP_ROOT/shared/updates"
export MAGIC_SIEGE_ROOT="$APP_ROOT"
export MAGIC_HOT_UPDATE_SOCKET="$APP_ROOT/shared/runtime/hot-update.sock"
printf '%s\n' "$$" > "$APP_ROOT/shared/runtime/service.pid"
exec "${NODE_BIN:-/usr/bin/node}" server/index.mjs >> "$APP_ROOT/shared/logs/server.log" 2>&1
