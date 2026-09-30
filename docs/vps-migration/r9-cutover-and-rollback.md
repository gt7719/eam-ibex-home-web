# R9 cutover and rollback

This procedure preserves the v80 Cloudflare deployment until the VPS has passed staging acceptance. DNS cutover is the only traffic switch; do not delete D1, R2, or the previous deployment during the observation window.

## Roles and evidence

Record the operator, approver, UTC start time, source export identifiers, migration report paths, release commit, image digest, DNS values, and backup restore-test result in the change ticket. Never copy secret values into the ticket.

The approved source release is the signed-off `v80-vps-ready` tag. The deployment must use the exact commit referenced by that tag and a locally verified `npm run quality:vps` result.

## Pre-cutover

1. Reduce the public DNS TTL at least one previous TTL period before the window.
2. Verify a fresh PostgreSQL dump and MinIO mirror can be restored in isolation.
3. Put the old application into a maintenance or write-frozen state.
4. Create final D1 and R2 exports and record their immutable identifiers.
5. Run the PostgreSQL and object migrations once against an empty target.
6. Require zero row-count and object-size reconciliation mismatches.
7. Start the tagged VPS image and require `/api/health` and `/api/ready` to return 200.
8. Complete every staging acceptance item in `r8-release-acceptance.md`.

Any failed item stops the cutover. Do not repair production data manually while traffic is enabled.

## Traffic switch

1. Keep old writes frozen.
2. Point the public DNS record or upstream load balancer to the VPS.
3. Verify the TLS certificate, hostname, redirect, and proxy headers.
4. From an external network, verify home, login, admin, media, Home AI, and Marketing AI test mode.
5. Monitor HTTP 5xx, readiness, container restarts, PostgreSQL connections, storage failures, and AI/email/SMS provider errors.
6. Re-enable writes only after the new path is healthy and the final reconciliation evidence is attached.

## Automatic rollback triggers

Rollback immediately when any of these occurs during the observation window:

- readiness remains unhealthy for five consecutive minutes;
- authentication or administrator access is unavailable;
- a confirmed data-loss, duplicate-write, or cross-user authorization defect appears;
- media retrieval or upload fails broadly;
- the error rate exceeds the agreed production baseline and cannot be mitigated without modifying live data;
- backup restoration evidence is invalidated.

## Rollback

1. Freeze VPS writes and preserve its logs and database state for investigation.
2. Restore the prior DNS or load-balancer target to the unchanged Cloudflare deployment.
3. Verify the old health, authentication, and core user paths externally.
4. Keep the VPS isolated; do not merge post-cutover writes automatically.
5. Reconcile any writes accepted by the VPS as a separate, reviewed recovery operation.
6. Record the trigger, UTC timestamps, affected requests, and recovery result.

Do not delete the VPS database to “retry” a migration. A retry uses a new empty target or a proven restored snapshot.

## Completion

After a stable observation window and a second successful backup restore test, raise DNS TTL to its normal value. Retire the old deployment only through a separate approved change after its retention period; this release does not authorize deletion of D1, R2, Cloudflare configuration, or backups.
