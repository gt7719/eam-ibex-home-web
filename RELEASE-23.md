# Version 23 — Organization environment integration

Baseline: version 22, commit `3fd05a8b644ef6d80281e4a7b601f019376f45bd`.
Imported approved organization prototype v3, commit `43ce5338e1036b3e190e095bedc714c1dbc8f421`.

- Adds a bilingual header link after Pricing to `/organization`.
- Keeps configurator scripts and styles isolated from the existing core and admin.
- Shares only global language/theme preferences; preview controls remain local.
- Organization inputs remain in memory and are cleared on reload or leaving the page.
- No payment, tenant provisioning, pricing-rule changes, or database migrations.
- Version 22 remains the immutable saved rollback baseline. This release does not overwrite its saved version.

Validation: existing source regression tests, configurator tests, integration tests and production build.
Real billing, menu-to-package rules and iBeX provisioning require separate approval and implementation.
