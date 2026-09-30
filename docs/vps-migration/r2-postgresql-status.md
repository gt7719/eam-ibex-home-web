# VPS migration — R2 PostgreSQL status

Status: In progress

## Implemented

- Pinned `pg` runtime dependency and TypeScript definitions.
- Added a lazy PostgreSQL connection pool selected by `DATABASE_URL`.
- Added a provider-neutral prepared-statement adapter for the existing D1-shaped application contract.
- Converts bound `?` parameters to PostgreSQL `$1..$n` parameters without replacing question marks inside quoted SQL or comments.
- Preserves `batch()` atomicity with `BEGIN`, `COMMIT`, and `ROLLBACK`.
- Added a PostgreSQL Drizzle schema mirroring all 33 protected D1 tables.
- Generated the initial PostgreSQL migration in `drizzle-postgres/`.
- VPS remains fail-closed when `DATABASE_URL` is absent.

## Remaining dialect remediation

Most application SQL is portable after placeholder conversion. The following SQLite-only behavior must be replaced and regression-tested before database readiness can pass:

1. `INSERT OR IGNORE` and `changes()` in subscription provisioning.
2. `instr()` in media-reference checks.
3. Migration-only `PRAGMA` and `strftime()` remain confined to the protected D1 migration history and must never be executed against PostgreSQL.
4. AI budget, rate-limit, approval, account setup, subscription, and provisioning transaction semantics require PostgreSQL integration tests.

The generated PostgreSQL migration intentionally remains separate from the protected D1 migration directory.
