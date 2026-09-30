# Ubuntu 22.04 VPS deployment runbook

## Prerequisites

- Docker Engine with Compose v2
- DNS record pointing to the VPS only after R8 acceptance
- A private `.env.vps` created from `.env.vps.example`
- Firewall allowing SSH from trusted administration addresses and public HTTP/HTTPS only
- An external backup destination not hosted on the same VPS disk

Never commit `.env.vps`, database dumps, object exports, TLS private keys, or migration reports containing operational metadata.

## First staging deployment

```bash
cp .env.vps.example .env.vps
# Replace every placeholder and configure the real domain and secrets.
docker compose --env-file .env.vps config --quiet
docker compose --env-file .env.vps build
docker compose --env-file .env.vps up -d
docker compose --env-file .env.vps ps
curl --fail http://127.0.0.1/api/health
curl --fail http://127.0.0.1/api/ready
```

The migration job must finish successfully before the application starts. The application readiness healthcheck requires both PostgreSQL and MinIO.

## Database migration and data import

For a new empty installation, the Compose migration job applies the checksum-protected PostgreSQL migrations automatically.

For an existing D1 deployment:

1. Export D1 with Wrangler into a protected SQL file.
2. Stop public writes or enable the maintenance window.
3. Run the schema migration.
4. Set `D1_SQL_EXPORT` to the protected export path and run `npm run data:import:d1` from an authorized migration host with `sqlite3` installed.
5. Review the generated reconciliation report before enabling traffic.

For R2 media, configure the `R2_SOURCE_*` and `S3_TARGET_*` variables on the migration host and run `npm run data:migrate:r2`. The tool checks the byte length of every copied object.

## Backup

Create a restricted backup directory outside the repository:

```bash
install -d -m 700 /var/backups/eam-ibex
docker compose --env-file .env.vps exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc \
  > /var/backups/eam-ibex/postgres-$(date -u +%Y%m%dT%H%M%SZ).dump
docker compose --env-file .env.vps run --rm \
  -v /var/backups/eam-ibex:/backup \
  --entrypoint /bin/sh minio-init -ec \
  'mc alias set local http://minio:9000 "$S3_ACCESS_KEY_ID" "$S3_SECRET_ACCESS_KEY" && mc mirror --overwrite "local/$S3_BUCKET" /backup/minio'
```

Encrypt and copy both backups offsite. A backup is not accepted until a restore test succeeds.

## Restore test

Restore only into an isolated staging stack:

```bash
pg_restore --clean --if-exists --no-owner --dbname "$DATABASE_URL" backup.dump
```

Restore MinIO objects with `mc mirror --overwrite`, start the staging application, and require `/api/ready`, account, admin, upload, Home AI, and Marketing AI smoke tests to pass.

## TLS

Terminate TLS at Nginx or an upstream managed reverse proxy. After certificates are installed, redirect port 80 to 443 and set `VINEXT_TRUSTED_HOSTS` to the exact public hostname. Do not expose PostgreSQL, MinIO API, or the MinIO console publicly.
