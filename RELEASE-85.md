# Version 85 — Clean publication of the Version 84 audit fixes

The complete implementation and validation are documented in RELEASE-84.md. Its source was saved as Site Version 84 but was not deployed: the first archive contained an unnecessary standalone VPS build. Sites deduplicates saves by source commit and retained that archive when a clean archive was supplied for the same commit. This release advances source metadata to 0.1.85 and publishes a freshly built Worker-only archive. No application behavior changes after the 230-test release gate.

Source baseline for the implementation remains published Site Version 83. All Version 82/83 refinements are preserved. Run the clean Cloudflare build, remove dist/standalone after the build, and verify no layout fixtures or standalone files remain before saving. Keep the existing audience. Provider credentials, real-service staging and Cloudflare's unattended cron trigger remain the explicit operational limits recorded in RELEASE-84.md.
