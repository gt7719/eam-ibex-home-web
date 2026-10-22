# Version 83 — Module drawer scroll fix

Base: published Site Version 82, commit `1bc27135e60a64383f55b43492fdf20060be98bb`.

Opening a module added `drawer-open` to the page body. A shared CSS rule applied `overflow: hidden` to both that nonmodal side drawer and the full detail modal, blocking background mouse-wheel scrolling. The drawer also contained scroll chaining at its edges.

The fix keeps the body scroll lock on `detail-open` only and restores native scroll chaining for `.drawer-scroll`. Drawer content still scrolls independently while it has room; at its edge the wheel can continue scrolling the page. Full detail modal containment remains.

## Validation — 2026-10-22

- Reproduced before the fix: Warehouse drawer open, computed body overflow hidden and background wheel unable to move the page.
- After the fix, desktop wheel scrolled the page from 0 to 894 and back to 0 while the drawer stayed open. Wheel over a drawer whose contents fit moved the page to 328.
- In a 390 × 650 iframe viewport, the drawer scrolled from 0 to 234 while page scroll stayed at 0; after reaching its 466px limit, another wheel input advanced page scroll to 187.
- Full product detail modal retained body overflow hidden; closing it restored auto overflow while the side drawer remained open.
- Lint, typecheck, whitespace checks and all 221 regression tests passed. A clean Cloudflare build and packaged artifact are used for publication.

Version 82's Home AI, copyright, collaboration animation and theme changes remain in place. No API, authentication or data changes are included.
