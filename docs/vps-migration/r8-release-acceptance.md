# R8 release acceptance

The VPS release is acceptable only when `npm run quality:vps` succeeds from a clean checkout using the locked dependencies.

## Automated gate

The gate verifies:

- tracked source files contain no common private-key or provider-key patterns;
- lint and TypeScript checks pass;
- the complete Cloudflare regression suite still passes;
- production dependencies contain no high or critical audit findings;
- the standalone Node artifact builds without `cloudflare:workers`;
- the artifact includes its environment guard and PostgreSQL migrations;
- the VPS process serves the home and health endpoints and fails readiness while dependencies are unconfigured;
- the deployment contract keeps PostgreSQL and MinIO off public ports;
- Docker Compose configuration is parsed when Compose is installed.

## Staging acceptance

Before production traffic is enabled, an operator must run the following against a staging deployment with real PostgreSQL and MinIO services:

1. `/api/health` returns 200 and `/api/ready` returns 200.
2. Web sign-in, email verification, SMS verification, and Turnstile follow the configured policy.
3. Admin sign-in and each authorized admin navigation section work.
4. Media upload, retrieval, replacement, and deletion reconcile with MinIO.
5. Home AI prompt, fallback, budget, rate limit, and audit records work.
6. Marketing AI test mode works without external delivery; production delivery remains approval-gated.
7. D1 and R2 migration reports have no count or byte-length mismatch.
8. PostgreSQL and MinIO backup restoration succeeds in an isolated stack.
9. SIGTERM drains the application before the configured shutdown deadline.

Failed staging acceptance blocks DNS cutover. A waiver must identify the failed item, owner, expiry, and rollback trigger; it must never waive data reconciliation, backup restoration, authentication, or readiness.
