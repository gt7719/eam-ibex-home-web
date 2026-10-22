# Version 86 — Primary logo and additional owner administrators

## Release identity

- Date: 2026-10-22 (Asia/Ulaanbaatar).
- Application version: `0.1.86`.
- Baseline: published Site Version 85, source `c760c0d587e13756c554391c87e5d65ace08e8b4`.
- Published Site source: `95e5e509a657febd6793bc1231c5e557e2ab1f18`.
- Saved Site version: `appgprj_6a81bb651d4c8191b8bf7c4a9a1492cc~appgver_32251a2dfa00819181e72b481f9df99c`.
- Deployment: `appgdep_6ad9dbf3cff08191a5764bab1864fa23`, succeeded.
- Site: https://eam-ibex.gantumur-e.chatgpt.site
- Local publication archive SHA-256: `53a3130f16ca39c4b0263fd5a2db15cae67ae07c21760142a7c3eb72ae896076`. This is the local tar checksum; the hosting service may normalize the archive and report a different storage content hash.
- This report was added retrospectively after GitHub synchronization; it was not present in the original published source.

## Approved scope and behavior

The owner supplied “Head of iBex logo.png” and designated it as the primary symbol. Its original bytes are preserved at `public/brand/ibex-primary-logo.png`, with provenance in `public/brand/README.md`. Browser icons were supplied as SVG, ICO and PNG derivatives (32, 180, 192 and 512 pixels). Root metadata references the browser and Apple-touch variants with Version 86 cache URLs. The separate wordmark rule—only X is magenta—remains applicable; the supplied symbol is black and white.

The administrator creation form now offers content administrator (`editor`) and owner administrator (`owner`). Content administrator remains the default. Choosing owner displays a full-access explanation and requires a confirmation in the form. This is direct account creation with a temporary password, not an email invitation.

The POST API authorizes the current session before creating an administrator, rejects unknown roles, hashes the password and assigns the full permission set to owners server-side. Existing owners cannot be suspended or have their permissions changed through this management endpoint; this conservatively protects all owner accounts, not just the last owner. An administrator-creation event is emitted to runtime logs. No durable administrator audit table or guaranteed log-retention mechanism was added.

## Changed files

- `app/admin/users/page.tsx`
- `app/api/admin/users/route.ts`
- `app/layout.tsx`
- `app/post-v30-admin.css`
- `package.json`, `package-lock.json`
- `public/brand/README.md`, `public/brand/ibex-primary-logo.png`
- `public/favicon.ico`, `public/favicon.svg`
- `public/ibex-icon-32.png`, `public/ibex-icon-180.png`, `public/ibex-icon-192.png`, `public/ibex-icon-512.png`
- `tests/admin-permissions.test.mjs`

No existing menu, route, stored setting or content was removed. No schema migration was required.

## Validation and limits

`npm run quality:vps` passed: lint, TypeScript, Cloudflare build, 232/232 regression tests, production dependency audit (0 vulnerabilities), VPS standalone build/artifact validation and bounded VPS HTTP smoke.

New API tests cover owner-only owner creation, full permissions, hashed credentials, invalid-role rejection and existing-owner protection. Initial test assertions incorrectly counted routine session writes as account mutations; they were narrowed to the security-relevant account writes, with production code unchanged by that test correction.

Browser QA confirmed icon metadata and icon rendering. Visiting administrator management without a valid session redirected to login; the complete form and real production account creation were not exercised through a signed-in browser. No production administrator was created by this release task. Docker Compose and real PostgreSQL/MinIO staging were unavailable; the smoke test does not prove configured service readiness.

## Known follow-up and GitHub history

Version 86 introduced white-backed icon derivatives. The owner subsequently requested transparency; Version 87 supersedes these derivatives while retaining the original supplied logo.

Versions 86 and 87 were synchronized together in [PR #5](https://github.com/gt7719/eam-ibex-home-web/pull/5), merged as `af9417e042906a9ff193774f2d58f30ad4124797`. This release did not deploy the owner's VPS, install an automatic deployment workflow, replace provider credentials or attach a Cloudflare cron. Operational limits in RELEASE-84.md and RELEASE-85.md remain.
