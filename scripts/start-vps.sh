#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root_dir"

if [[ ! -f dist/standalone/server.js ]]; then
  echo "VPS artifact is missing; building it before startup."
  npm run build:vps
fi

node_args=()
if [[ -f .env.vps ]]; then
  node_args+=(--env-file=.env.vps)
fi

export IBEX_RUNTIME=node
exec node "${node_args[@]}" dist/standalone/server.js
