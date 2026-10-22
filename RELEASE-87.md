# Version 87 — Stable pricing recommendation badge and transparent icons

## Release identity

- Date: 2026-10-22 (Asia/Ulaanbaatar).
- Application version: `0.1.87`.
- Baseline: published Site Version 86, source `95e5e509a657febd6793bc1231c5e557e2ab1f18`.
- Published Site source: `af538dda1ea548fe620e182f48b4eed6877744a1`.
- Saved Site version: `appgprj_6a81bb651d4c8191b8bf7c4a9a1492cc~appgver_ea1b9dd7b77481919542506a9171b68c`.
- Deployment: `appgdep_6ad9e14892388191953f48e09b28c102`, succeeded.
- Site: https://eam-ibex.gantumur-e.chatgpt.site
- Local publication archive SHA-256: `7720a847fe8d0c99d46efdfdc03c50004c73b7f069f43a937e83effa1e9e64bb`. This identifies the local tar, not a hosting-service normalized storage object.
- This report was added retrospectively after GitHub synchronization; it was not part of the original published source.

## Approved scope and resulting behavior

The recommended-plan badge previously lived inside the plan heading. On a narrow card it wrapped the Plus heading and shifted the price relative to neighboring cards. It now sits as a direct card child, positioned at the upper-right with its own reserved top space. All pricing cards use a consistent top-aligned flex layout. The badge is separate from the heading and does not take pointer events.

Day mode uses deep-purple text (`#581080`), a light-purple background (`#f0ddff`) and a visible border (`#9b60bd`). Night mode retains a light label on a dark-purple badge. MN/EN badge labels remain supported.

The supplied logo was processed with the built-in image tool for background extraction, with a prompt to remove white inside and outside the ring and retain the black silhouette, horns, proportions and enclosing circle. The result is stored as `public/brand/ibex-logo-transparent.png`; the uploaded original remains unchanged. Browser PNG, ICO and SVG derivatives now use the transparent result, and root icon URLs use Version 87 cache parameters. The extraction was visually inspected; pixel-for-pixel equivalence of the generated artwork to the supplied original is not claimed. Header branding was not globally replaced in this change.

## Changed files relative to Version 86

- `app/layout.tsx`
- `package.json`, `package-lock.json`
- `public/brand/README.md`, `public/brand/ibex-logo-transparent.png`
- `public/concept.html`
- `public/favicon.ico`, `public/favicon.svg`
- `public/home-refinements.css`
- `public/ibex-icon-32.png`, `public/ibex-icon-180.png`, `public/ibex-icon-192.png`, `public/ibex-icon-512.png`

No menu, account feature, API route, stored configuration or data was removed. No database migration or provider-setting change was required.

## Validation and evidence limits

The full `npm run quality:vps` gate passed before publication. It was run again for GitHub synchronization: lint, TypeScript, Cloudflare build, 232/232 tests, production dependency audit (0 vulnerabilities), VPS standalone build/artifact validation and bounded VPS smoke all passed. The final Cloudflare publication build also passed.

Local preview could not load real published pricing. Temporary fixture pages supplied representative plan data while exercising the actual renderer and styles; these pages were removed before packaging. Desktop inspection confirmed all five plan headings had the same vertical position. At a 390px iframe viewport, the featured card was 314px wide and the badge remained inside the card and above the heading. MN and EN desktop labels were inspected. A 768px fixture was opened, but a complete tablet pricing flow and every language/theme/viewport combination were not fully verified.

All four PNG sizes retained RGBA alpha with transparent corner pixels. Checkerboard browser inspection confirmed transparency both outside and inside the logo ring. These are local checks, not proof that every browser has refreshed a previously cached favicon.

Real signed-in administrator creation, PostgreSQL/MinIO, email, SMS, payment, paid AI and backup-restore integration were not exercised. Existing OpenAI credential and unattended Cloudflare retention-cron requirements remain operator follow-up items.

## GitHub synchronization and continuation

[PR #5](https://github.com/gt7719/eam-ibex-home-web/pull/5) synchronized the 18-file combined Version 85-to-87 delta and was merged normally.

- GitHub change commit: `b74309baed8cc58ac9c651022b9fa48863e98348`.
- GitHub merge commit: `af9417e042906a9ff193774f2d58f30ad4124797`.
- Entire source Git tree: `6f1bd70be2956be5de77c5609336521c2183d145`, matching the published Site source at synchronization.
- Every changed Git blob SHA was verified. Existing files, modes and history were preserved.
- No pull-request-triggered GitHub Actions runs were returned for the PR head. Validation above was local; GitHub CI success is not claimed.

These retrospective reports add documentation after that tree comparison; the published application's runtime source remains Version 87. Development requires Node.js >=22.13.0. Follow README.md for development and docs/vps-migration/deployment-runbook.md for VPS operations. GitHub merge does not itself prove VPS deployment; no VPS connection, deployment or automatic merge-to-server workflow was performed.
