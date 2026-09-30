#!/usr/bin/env bash
set -euo pipefail

expected_commit="384ac5b04f62957d1fe8217aa35dafd832bf888b"
minimum_tests=195
expected_migrations=15
expected_tables=33

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root_dir"

baseline_commit="$(git rev-list -n 1 v80-baseline 2>/dev/null || true)"
if [[ "$baseline_commit" != "$expected_commit" ]]; then
  echo "v80-baseline tag mismatch: expected $expected_commit, got ${baseline_commit:-missing}" >&2
  exit 1
fi

migration_count="$(find drizzle -maxdepth 1 -type f -name '*.sql' | wc -l | tr -d ' ')"
table_count="$(grep -o 'sqliteTable(' db/schema.ts | wc -l | tr -d ' ')"

if [[ "$migration_count" != "$expected_migrations" ]]; then
  echo "D1 migration count changed: expected $expected_migrations, got $migration_count" >&2
  exit 1
fi

if [[ "$table_count" != "$expected_tables" ]]; then
  echo "D1 table count changed: expected $expected_tables, got $table_count" >&2
  exit 1
fi

test_output="$(mktemp)"
trap 'rm -f "$test_output"' EXIT

npm run lint
npm run typecheck
npm run test | tee "$test_output"

test_count="$(grep -E 'tests[[:space:]]+[0-9]+$' "$test_output" | tail -n 1 | awk '{print $NF}')"
if [[ -z "$test_count" || "$test_count" -lt "$minimum_tests" ]]; then
  echo "Regression test count regressed: expected at least $minimum_tests tests, got ${test_count:-unknown}" >&2
  exit 1
fi

npm run audit:prod
echo "v80 baseline verified: tag, schema, migrations, $test_count tests, build, and high-severity production audit gate."
