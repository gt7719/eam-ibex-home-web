# Version 82 — Home UI refinements

Approved source baseline: Version 81, GitHub main `545afc601991db45b448b0086f4ee079c7f161ac` (merged PR #3). The same source was saved as Site Version 81 before these edits. Earlier Version 45 and Version 80 history remains intact.

## Approved changes

- Keep iBeX once in the assistant header title. Use an AI avatar, “Таны цахим туслах” / “Your digital assistant” subtitle and a keyboard-accessible “Ажиллах хүрээ” / “How it works” disclosure.
- Move the provider/general-knowledge and service-boundary explanation into that disclosure. Keep processing consent and privacy controls visible and unchanged.
- Replace the prominent technical status with “Танд юугаар туслах вэ?” / “How can I help you?” and a short welcome. The welcome follows language changes without replacing conversation history.
- Add centered © 2026 iBeX copyright in MN/EN below the collaboration section.
- Run a light down the green connector on a three-second cycle; brighten and shrink the end ring on arrival. Respect reduced-motion preferences.
- Improve the collaboration kicker contrast with #166534 in day mode and #86EFAC in night mode.

## Validation — 2026-10-22

- JavaScript syntax, whitespace, lint and TypeScript checks passed.
- All 221 existing regression tests passed. Text assertions were updated for the approved copy; service-boundary, consent, history and API behavior checks remain.
- VPS standalone build/artifact validation and HTTP smoke passed.
- Browser QA passed for the public widget, collapsed/expanded disclosure, keyboard activation, MN/EN switching, day/night themes and copyright layout. A 390 × 844 iframe viewport verified the mobile layout and consent-gated controls; no AI request was submitted.
- Browser-computed styles verified the three-second animation and changing light transform, and the day-mode kicker color rgb(22, 101, 52).

The final Cloudflare deployment is packaged from this source. This release changes public UI only; real provider/Core integration, database migration, backup restoration and VPS infrastructure acceptance remain outside this UI validation.
