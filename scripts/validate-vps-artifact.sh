#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root_dir"

server_entry="dist/standalone/server.js"
if [[ ! -f "$server_entry" ]]; then
  echo "Missing VPS standalone server entry: $server_entry" >&2
  exit 1
fi

if ! grep -q 'Graceful shutdown timed out' "$server_entry"; then
  echo "VPS artifact is missing the managed graceful-shutdown server entry" >&2
  exit 1
fi

if [[ ! -f "dist/standalone/vps-env.mjs" ]]; then
  echo "VPS artifact is missing startup environment validation" >&2
  exit 1
fi

if [[ ! -f "dist/standalone/migrate-postgres.mjs" ]]; then
  echo "VPS artifact is missing the PostgreSQL migration runner" >&2
  exit 1
fi

if ! compgen -G "dist/standalone/drizzle-postgres/*.sql" >/dev/null; then
  echo "VPS artifact is missing PostgreSQL migration SQL" >&2
  exit 1
fi

if grep -R -n --include='*.js' --include='*.mjs' 'cloudflare:workers' dist/standalone; then
  echo "VPS artifact still contains the Cloudflare-only module scheme" >&2
  exit 1
fi

if ! grep -R -q --include='*.js' --include='*.mjs' 'RuntimeServiceUnavailableError' dist/standalone; then
  echo "VPS artifact does not contain the fail-closed Node runtime provider" >&2
  exit 1
fi

echo "Validated VPS artifact: Node server, environment guard, and database migrations are present with no cloudflare:workers import."
