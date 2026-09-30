#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root_dir"

IBEX_RUNTIME=node vinext build
cp scripts/vps-server.mjs dist/standalone/server.js
cp scripts/vps-env.mjs dist/standalone/vps-env.mjs
cp scripts/migrate-postgres.mjs dist/standalone/migrate-postgres.mjs
cp -R drizzle-postgres dist/standalone/drizzle-postgres
chmod 755 dist/standalone/server.js
bash scripts/validate-vps-artifact.sh
