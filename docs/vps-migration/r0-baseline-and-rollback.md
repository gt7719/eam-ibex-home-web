# VPS migration — R0 baseline and rollback

Status: Implemented

## Protected baseline

- Release: v80
- Source commit: `384ac5b04f62957d1fe8217aa35dafd832bf888b`
- Protected tag: `v80-baseline`
- Migration branch: `vps/node-runtime`
- Required Node.js: `>=22.13.0`
- D1 migrations: 15 (`drizzle/0000` through `drizzle/0014`)
- D1 schema tables: 33
- Regression baseline: at least 195 passing tests

The protected tag must not be moved or rewritten. VPS work must remain on the migration branch until the R8 release gates pass.

## Verified R0 gates

Run:

```bash
npm ci
npm run baseline:v80
```

The gate verifies the protected commit, schema and migration inventory, lint, type checking, the Cloudflare production build, a non-decreasing regression contract starting at 195 tests, and production dependency vulnerabilities at high or critical severity.

The 2026-09-30 baseline audit reports one moderate `baseline-browser-mapping` advisory and no high or critical production advisory. It must be resolved in an isolated dependency update, not by an unreviewed bulk `npm audit fix` during runtime migration.

## Runtime inventory

- 45 application/database modules directly import `cloudflare:workers`.
- Database access is coupled to the D1 binding `env.DB`.
- Object storage uses the R2 binding `env.BUCKET` for media and profile images.
- Worker delivery uses `env.ASSETS` and Cloudflare Images uses `env.IMAGES`.
- No live secret value was found by the R0 repository pattern scan. Example secret names remain intentionally documented in `.dev.vars.example`.

## Change-preservation rules

1. Do not commit directly to `main` or alter `v80-baseline`.
2. Keep the existing Cloudflare build working until VPS cutover has passed its soak period.
3. Introduce adapters before changing route behavior.
4. Do not combine runtime migration with UI, menu, permission, AI-policy, or pricing changes.
5. Add or update tests with every migration step; the existing 195 tests may not silently disappear.
6. Do not delete D1 migrations, Cloudflare adapters, or R2 paths until data reconciliation and rollback expiry are approved.
7. Never commit `.env`, database dumps, object-storage exports, API keys, passwords, or session secrets.

## Rollback procedure

Before production cutover:

```bash
git switch --detach v80-baseline
npm ci
npm run baseline:v80
```

Deploy the verified Cloudflare artifact from the protected tag. DNS must remain unchanged until VPS database and object-storage reconciliation is complete. After cutover, retain the v80 Cloudflare deployment and pre-cutover D1/R2 snapshots for at least 30 days.

## Data prerequisite

R6 cannot run until the operator confirms whether production D1 and R2 contain live data and supplies export access. Code migration may continue before that decision; destructive migration or cutover may not.
