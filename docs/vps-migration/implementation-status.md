# v80 VPS implementation status

| Phase | Status | Delivered control |
| --- | --- | --- |
| R0 | Complete | Immutable v80 baseline, branch, rollback reference |
| R1 | Complete | Provider-neutral runtime boundary; no Node import of `cloudflare:workers` |
| R2 | Complete | PostgreSQL adapter, schema, transactional checksum migrations |
| R3 | Complete | S3-compatible MinIO object-storage adapter |
| R4 | Complete | Health, dependency readiness, graceful shutdown |
| R5 | Complete | Fail-closed production environment validation and secret separation |
| R6 | Complete | D1 and R2 migration tools with reconciliation reports |
| R7 | Complete | Node 22 container, PostgreSQL, MinIO, migration job, Nginx |
| R8 | Complete | One-command regression, security, build, and smoke release gate |
| R9 | Code complete | Cutover and rollback procedure; live execution requires VPS credentials, migrated data, TLS, and DNS authority |

## Release commands

```bash
npm run quality:vps
cp .env.vps.example .env.vps
# Replace all placeholders, then:
docker compose --env-file .env.vps config --quiet
docker compose --env-file .env.vps build
docker compose --env-file .env.vps up -d
docker compose --env-file .env.vps ps
```

The application runtime is Node.js 22. PostgreSQL and MinIO are private to the Compose backend network; only Nginx publishes HTTP. Production TLS must be configured before public cutover.

## Remaining operator-owned actions

- install Docker Engine and Compose v2 on Ubuntu 22.04;
- provide real, distinct secrets in `.env.vps`;
- configure TLS and the exact trusted hostname;
- run D1/R2 final export, migration, and reconciliation;
- perform staging acceptance and backup restore testing;
- approve and execute DNS cutover.

These actions are intentionally not embedded into source control because they require production credentials, infrastructure access, and a controlled maintenance window.
