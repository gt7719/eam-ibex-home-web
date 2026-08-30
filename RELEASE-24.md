# Organization modal and staged package configuration

Baseline: immutable version 23 (`13fc07815d3dfd78766051e87d4e7a7045b4d959`); version 22 remains unchanged in history.

## Changes
- Organization configurator opens in a native dialog on the main screen. Its iframe is retained on close; reload still clears personal draft inputs.
- Pricing admin uses Free → Go → Plus → Pro → Custom → Review tabs, inherited menus, total user/asset limits and bilingual price fields.
- Existing `pricing.manage` permission protects every package admin request. Legacy price writes cannot bypass publication.
- Draft/published state and immutable publication snapshots use existing D1 `site_content` keys. No schema migration is needed. Compare-and-swap and conditional history inserts run in one atomic batch.
- Restore creates a draft; publish requires review. Only published configuration is returned by public APIs.
- Pricing cards and recommendations share the same published model. Parent and Child assets both count; users means Active plus Inactive.
- Existing price values seed the initial configuration. Extra capacity pricing is not invented. Default capacity policy requests review; admins may instead enable next-tier recommendations.
- No payments, real tenant provisioning or confirmed order mutation is implemented.

## Verification
Source regression and model tests cover inheritance, limits, mandatory menus, HSE/Custom, scoped appearance, and modal lifetime. API tests cover permissions, draft isolation, stale revisions, atomic history and restore-to-draft behavior. Production build validates the Worker artifact.
The repository's standalone TypeScript check currently lacks Cloudflare runtime type declarations (also affecting pre-existing files); the production build and runtime tests are the release gate.
