#!/usr/bin/env bash
# =============================================================================
# dev.sh — boot the whole Trust Platform locally with ONE command.
#
#   ./dev.sh
#
# It starts three application processes. The "4th part" — PostgreSQL + Kafka —
# is started automatically by Quarkus Dev Services through your container
# runtime (Podman/Docker), so you do not launch it yourself.
#
#   1. detection-engine        FastAPI ML scorer     http://localhost:8000/docs
#   2. accountability-service  Quarkus backend API   http://localhost:8081/q/dev
#        └─ Dev Services (automatic): PostgreSQL + Kafka containers
#   3. player-portal           React/Vite frontend   http://localhost:5173
#
# Logs from all services stream here, colour-prefixed. Press Ctrl+C ONCE to
# stop everything cleanly. Once the web portal is ready it opens in your
# browser automatically, so the single command really does feel like
# "launch the app".
#
# Handy overrides (env vars):
#   ENGINE_PORT=8000 API_PORT=8081 PORTAL_PORT=5173  ./dev.sh
#   NO_RELOAD=1 ./dev.sh          # disable uvicorn auto-reload
#   NO_OPEN=1   ./dev.sh          # don't auto-open the browser
# =============================================================================
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENGINE_PORT="${ENGINE_PORT:-8000}"
API_PORT="${API_PORT:-8081}"
PORTAL_PORT="${PORTAL_PORT:-5173}"
# --- colours -----------------------------------------------------------------
C_BOOT=$'\033[1;32m'; C_ENGINE=$'\033[36m'; C_API=$'\033[33m'
C_PORTAL=$'\033[35m'; C_WARN=$'\033[1;31m'; C_RESET=$'\033[0m'
log()  { printf '%s[boot]%s %s\n'  "$C_BOOT" "$C_RESET" "$*"; }
warn() { printf '%s[boot]%s %s\n'  "$C_WARN" "$C_RESET" "$*"; }
# --- clean shutdown: kill each service's whole process group -----------------
PGIDS=()
cleanup() {
  printf '\n'; log "shutting down…"
  for pgid in "${PGIDS[@]:-}"; do
    kill -TERM -- "-${pgid}" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  log "all stopped. bye 👋"
}
trap cleanup INT TERM EXIT
# start <name> <colour> <subdir> <command string>
# Runs the command in its own session (setsid) so we can kill the whole tree,
# and prefixes every line of its output with a colour-coded [name] tag.
start() {
  local name="$1" colour="$2" dir="$3" cmd="$4"
  setsid bash -c "cd '$ROOT/$dir' && ${cmd} 2>&1 | sed -u 's/^/${colour}[${name}]${C_RESET} /'" &
  PGIDS+=("$!")
}
# --- preflight: make sure deps exist so it 'just boots' ----------------------
log "Trust Platform — local boot"
# container runtime (needed by Quarkus Dev Services for Postgres + Kafka)
if ! command -v podman >/dev/null 2>&1 && ! command -v docker >/dev/null 2>&1; then
  warn "No podman/docker found — Quarkus Dev Services can't start Postgres/Kafka."
  warn "Install a container runtime, then re-run."
fi
# 1) detection-engine: venv + editable install + trained model
if [ ! -x "$ROOT/detection-engine/.venv/bin/uvicorn" ]; then
  log "detection-engine: creating venv + installing deps (first run only)…"
  ( cd "$ROOT/detection-engine" \
      && python3 -m venv .venv \
      && ./.venv/bin/pip install --quiet --upgrade pip \
      && ./.venv/bin/pip install --quiet -e ".[dev]" )
fi
if [ ! -f "$ROOT/detection-engine/models/model.joblib" ]; then
  log "detection-engine: no trained model found — training one now…"
  ( cd "$ROOT/detection-engine" && ./.venv/bin/python -m detection_engine.train )
fi
# 2) player-portal: node_modules
if [ ! -d "$ROOT/player-portal/node_modules" ]; then
  log "player-portal: installing npm dependencies (first run only)…"
  ( cd "$ROOT/player-portal" && npm install --silent )
fi
# --- launch ------------------------------------------------------------------
RELOAD_FLAG="--reload"; [ "${NO_RELOAD:-0}" = "1" ] && RELOAD_FLAG=""
log "starting detection-engine   → http://localhost:${ENGINE_PORT}/docs"
start engine "$C_ENGINE" "detection-engine" \
  ".venv/bin/uvicorn detection_engine.app:app --host 127.0.0.1 --port ${ENGINE_PORT} ${RELOAD_FLAG}"
log "starting accountability-svc → http://localhost:${API_PORT}/q/dev  (boots Postgres + Kafka via Dev Services)"
start api "$C_API" "accountability-service" \
  "DETECTION_ENGINE_URL=http://localhost:${ENGINE_PORT} mvn --no-transfer-progress quarkus:dev -Dquarkus.http.port=${API_PORT} -Dquarkus.analytics.disabled=true"
log "starting player-portal      → http://localhost:${PORTAL_PORT}"
start portal "$C_PORTAL" "player-portal" \
  "npm run dev -- --port ${PORTAL_PORT} --strictPort"
log "all three launched. Postgres + Kafka come up automatically under the backend."
log "open the app at  http://localhost:${PORTAL_PORT}   (Ctrl+C here stops everything)"
# --- auto-open the browser once the portal responds --------------------------
# Runs in the background so it never blocks the log stream. Waits for the Vite
# dev server to answer, then opens the default browser (opt out with NO_OPEN=1).
open_when_ready() {
  local url="http://localhost:${PORTAL_PORT}"
  for _ in $(seq 1 60); do
    if curl -sf -o /dev/null "$url" 2>/dev/null; then
      local opener=""
      if   command -v xdg-open >/dev/null 2>&1; then opener="xdg-open"
      elif command -v open     >/dev/null 2>&1; then opener="open"        # macOS
      elif command -v wslview  >/dev/null 2>&1; then opener="wslview"     # WSL
      fi
      if [ -n "$opener" ]; then
        log "portal is ready — opening $url in your browser"
        "$opener" "$url" >/dev/null 2>&1 || true
      else
        log "portal is ready — open $url in your browser"
      fi
      return
    fi
    sleep 1
  done
  warn "portal didn't respond in time — open http://localhost:${PORTAL_PORT} manually"
}
if [ "${NO_OPEN:-0}" != "1" ]; then
  open_when_ready &
fi
# Wait for all background services; if any exits, keep the console attached so
# its logs remain visible until the user stops with Ctrl+C.
wait
