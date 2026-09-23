# iBeX Home Web release governance

1. Start only from the latest published Site version. The Site version commit, `main` commit, local `HEAD`, and release baseline must match before editing.
2. Use the latest published Site source as the single source of truth. Do not publish from an old ZIP, stale checkout, or build-only artifact.
3. Allow one publisher at a time. A rejected push or baseline mismatch stops the release until changes are reconciled without force-pushing.
4. Apply a controlled delta. Unrelated UI, settings, permission, API, data, language, theme, or responsive behavior must remain unchanged.
5. Keep every approved feature in `APPROVED-FEATURES.json` with its stable feature ID and must-preserve contract.
6. Do not rewrite an older regression test merely to make a new implementation pass. A superseded assertion may change only when the owner explicitly approves the replacement behavior; the remaining contract stays covered.
7. No silent removal. Removing a field, control, permission, route, API, or stored setting is a breaking change requiring explicit owner approval.
8. Preserve stored data. A hidden or temporarily inactive setting is retained and must not be cleared or replaced with a default during upgrades.
9. Run the complete build and regression suite before publication. A failing approved-feature contract blocks publication.
10. Publish the exact tested commit and record Site version, commit SHA, archive hash, test count, baseline, changed files, and approved removals.
11. Reconcile the deployed version and commit after publication. Roll back to the prior immutable version if they do not match.

The three absolute prohibitions are: never start from a non-latest production source; never rewrite old regression coverage without an explicitly approved replacement; never remove approved UI, configuration, permission, data, or API behavior without explicit approval.
