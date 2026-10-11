# Version 81 — VPS audit remediation

Base: GitHub main `9dbffc15748e7056fbe8cf305f24583647a88800`.
Design baseline: Version 45 `8dd217105c7a707aa67b7c9576ca13dfa2ebae7e`.
Preserved published release: Version 80 `384ac5b04f62957d1fe8217aa35dafd832bf888b`.

## Changes

- Pin patched sharp, source-map-js and baseline-browser-mapping transitive dependencies. The 2026-10-11 pre-upload audit also requires Next.js and eslint-config-next 16.3.8 for the subsequently indexed Next.js advisories.
- Pass known file/object sizes into S3 uploads and R2-to-S3 transfer; reject streams without a size. Keep original filenames in database records and encode non-ASCII S3 metadata for HTTP transport.
- Distinguish NoSuchKey from infrastructure failures and use HeadBucket for Node readiness. Check application schema tables before reporting ready.
- Bind administrator and website-user authentication throttles to the action/subject, independent of client IP headers. Replace forwarded IP headers at the Nginx ingress.
- Apply a shared security policy and preview visibility/session guard on both Cloudflare and Node. Hidden preview assets are protected as well as entry HTML; dependency errors fail closed.
- Verify the immutable v80 commit in clones without tags. Deployment approval identifies an exact reviewed commit; no missing or unverified “ready” tag is required.

Existing menus, pricing, MN/EN content, themes, approved feature permissions, AI boundaries and prior release files are preserved. Version 81 is a source release candidate; this file does not claim production deployment or live staging acceptance.

## Acceptance

Run `npm run quality:vps` with locked dependencies. The new behavioral tests issue synthetic local HTTP requests for upload and missing-bucket failures, exercise hidden preview/session behavior, and verify that IP-header changes do not reset authentication limits. Run `npm run baseline:v80` when checking the full protected baseline contract.

Production cutover still requires Node 22/container staging with PostgreSQL/MinIO, real login/provider/Core integration, TLS, migration reconciliation, backup restoration and browser acceptance. No production credentials, data or DNS are changed by this source release.

## Validation — 2026-10-07

`npm run quality:vps` passed on Linux, Node 24.19.0 and npm 11.9.0: lint, typecheck, Cloudflare build, 221/221 regression tests, production audit (0 vulnerabilities), VPS standalone build/artifact validation and HTTP smoke tests. The smoke run verified home/health 200, anonymous admin session 401, unconfigured readiness/previews 503 and shared security headers.

`npm run baseline:v80` also passed without a baseline tag: the immutable commit ancestry, 15 D1 migrations, 33 schema tables, 221 tests, build and production audit gates were verified. Version 45 remains an ancestor of this release.

Docker Compose and real PostgreSQL/MinIO services were unavailable in this environment. Synthetic local S3 HTTP tests are regression evidence, not live infrastructure acceptance. Browser acceptance and the production cutover remain pending.

## GitHub upload validation — 2026-10-11

The saved Site remains Version 80 and GitHub main remains `9dbffc15748e7056fbe8cf305f24583647a88800`; both are preserved in Version 81's ancestry. A fresh pre-upload production audit found six Next.js advisories indexed after the earlier validation. Next.js and eslint-config-next were updated from 16.3.6 to the patched 16.3.8, with a regenerated lockfile and clean `npm run install:ci`.

The full `npm run quality:vps` gate passed again on Linux/Node 24.19.0/npm 11.9.0: lint, typecheck, Cloudflare build, 221/221 regression tests, production audit (0 vulnerabilities), VPS build/artifact validation and HTTP smoke. The infrastructure/browser acceptance limits above still apply.
