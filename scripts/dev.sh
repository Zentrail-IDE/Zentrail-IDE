#!/usr/bin/env bash
# Zentrail IDE — developer bootstrap for POSIX shells.
# Installs workspace deps, then starts the desktop shell, Go core, and Python RT
# in the background. Use `scripts/build.sh` to produce a release bundle.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> Installing workspace dependencies"
pnpm install

echo "==> Starting Go core (port ${ZENTRAIL_PORT:-7341})"
pnpm go:run &

echo "==> Starting Python runtime"
pnpm py:run &

echo "==> Starting desktop shell (Tauri dev)"
pnpm dev

wait
