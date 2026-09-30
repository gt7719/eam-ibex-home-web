#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root_dir"

if ! git diff --check; then
  echo "Release rejected: whitespace errors are present." >&2
  exit 1
fi

secret_pattern='(sk-(proj-)?[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----)'
if git grep -I -n -E "$secret_pattern" -- ':!package-lock.json'; then
  echo "Release rejected: a likely secret exists in a tracked file." >&2
  exit 1
fi

if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  temp_env="$(mktemp)"
  trap 'rm -f "$temp_env"' EXIT
  sed \
    -e 's/replace-with-a-long-random-password/test-only-password/' \
    -e 's/replace-with-a-long-random-minio-user/test-only-minio-user/' \
    -e 's/replace-with-a-long-random-minio-secret/test-only-minio-secret/' \
    -e 's/replace-with-at-least-32-random-characters/0123456789abcdef0123456789abcdef/' \
    .env.vps.example > "$temp_env"
  docker compose --env-file "$temp_env" config --quiet
else
  echo "Docker Compose is unavailable; static deployment contract tests will be used."
fi

npm run lint
npm run typecheck
npm run test
npm run audit:prod
npm run build:vps
npm run smoke:vps

echo "VPS release gate passed."
