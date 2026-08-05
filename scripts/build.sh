#!/usr/bin/env bash
# Zentrail IDE — build every layer for a release.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> Type-check + lint + test"
pnpm lint
pnpm typecheck
pnpm test

echo "==> Build TypeScript packages"
pnpm build

echo "==> Build Go core"
pnpm go:build

echo "==> Build desktop (Tauri)"
pnpm tauri build
