# Version 84 — Customer access, reliability and audit remediation

Baseline: published Site Version 83, source `6047f1898e1cf13e6f97e2379ea6bc00ce082641`. Owner authorized implementation on 2026-10-22. GitHub synchronization also includes the already accepted Version 82 and 83 changes absent from GitHub main.

## Result

- Home AI is available only inside a loaded website account. The public homepage loads no assistant widget. The chat API rejects unauthenticated requests before reading model settings or making paid calls.
- Public model failures use friendly MN/EN customer copy. Administrator connection tests retain their technical diagnostics and audit error codes. Failed questions remain in the composer without duplicate user-history entries; quota timers unlock at the server-provided retry time. HTTP previews use a supported correlation-ID fallback.
- Password reset claims a still-valid token inside the same transaction as credential and session updates. A competing claim makes no credential change; failures roll back the claim.
- Account responses expose the active entitlement separately from the latest plan request. Overview and workspace access use the active entitlement. Calendar month additions clamp to the destination month's last day, retaining UTC time.
- Retention includes private profile objects and rows, globally expires chat history for inactive users, and retains object pointers when storage deletion fails. VPS runs at startup and hourly with an ephemeral internal credential. Cloudflare exports a scheduled handler and has a request-triggered hourly backstop.
- CAPTCHA widgets renew after every completed submission attempt; unavailable configuration disables submission with a readable message. Email/SMS requests have 15-second and Turnstile validation a 10-second timeout.
- Marketing AI checks and dry runs preserve original approval provenance. Credential presence is presented as configured, never as proof that OAuth or delivery worked.
- Customer API messages have a shared bilingual presentation layer. Account labels use translated feature names and readable payment/provisioning states. Registration, SMS and storage-policy descriptions match configurable verification and both deployment providers.
- Closed drawers and menus are inert. Custom dialogs constrain Tab focus and restore focus. Day-theme calls to action and collaboration/chat labels have darker colors. Pricing errors use a compact retry card and no misleading zero-plan title. Modules lacking authentic screenshots hide the empty media section; existing explanatory content remains.

## Approved supersession and organization

The public assistant launcher is intentionally removed under the owner's signed-in-only requirement; the server's external-action and data-boundary restrictions remain. Four historical test assertions were updated for the explicitly approved changes: token implementation moved into an atomic helper, provider-neutral privacy wording, friendly account-chat wording, and account-only chat placement. Their remaining contracts are retained. New behavior tests use actual in-memory SQLite transactions, not just source-pattern matching.

Domain rules were extracted into account-token, calendar, data-retention, api-message and chat-session-id modules. README documents the real project, deployment providers and the existing ordered public rendering pipeline. A wholesale rewrite of that pipeline is not included in this bounded release.

## Validation and limits

- `npm run quality:vps` passed: lint with no warnings, TypeScript, Cloudflare build, **230/230 tests**, production dependency audit (**0 vulnerabilities**), VPS build and HTTP smoke. A final separate VPS smoke also passed after all builds finished. Validation host: Node 24.19.0. Docker/real service staging was unavailable.
- New behavior coverage checks competing token consumers, rollback, expiry, month-end/leap-year calculations, approval provenance, safe bilingual errors, inactive-user retention, failed-object-delete retry, anonymous chat rejection and HTTP correlation IDs. The test loader transpiles TypeScript explicitly for the declared Node 22.13 minimum; it is also exercised with native type stripping disabled.
- Browser QA: public assistant absent; closed drawer skipped by Tab; Warehouse drawer body scroll reaches 562; missing-screenshot section hidden; pricing error and day-theme button colors checked; 390px Home AI layout has no horizontal overflow and Shift+Tab wraps from Close to Ask. The account component was inspected through a temporary local layout fixture, not a real signed-in production account. Fixtures are removed before the final clean artifact.
- Production logs confirm an existing `OPENAI_AUTH_ERROR`. No secret was read or replaced and no paid provider test was made. A valid Home AI credential/administrator connection test is still required for real model answers.
- Real PostgreSQL/MinIO, delivery providers, core eAM and backup restoration remain operator staging checks. The VPS hourly timer is implemented; Sites must attach an hourly Cloudflare cron trigger for unattended cleanup while there are no requests. The request backstop alone is not a guarantee during inactivity.
- No genuine Warehouse or Parts/BOM screenshots were supplied; none were fabricated.

The publishing tool records the exact saved source SHA and archive hash. Preserve the existing Site audience.
