# Version 88 — Hidden vertical scrollbars with native scrolling

Approved by the owner on 2026-10-23. Runtime baseline: published Site Version 87, source af538dda1ea548fe620e182f48b4eed6877744a1. GitHub baseline: 21131b4df70b4326db27a23ded46c7ea02931eb2 (V87 plus retrospective release reports).

## Changes

Hide vertical scrollbar chrome on the main page and nested menus, drawers and detail surfaces. The React application receives the rules through globals.css; the four standalone HTML/iframe documents load the shared public/scrollbars.css. No overflow, scroll chaining, modal containment, wheel/touch handlers or keyboard controls are changed. WebKit/Blink use zero vertical scrollbar width; Firefox uses scrollbar-width:none, which hides scrollbar chrome on both axes while preserving scrolling.

Application/package lock version is 0.1.88; the approved-feature manifest records the native-scrolling contract. Existing content, routes, stored settings and data are preserved. No migration or credential changes are required.

## Validation

Lint, TypeScript, Cloudflare build and all 232 regression tests passed. Browser inspection confirmed scrollbar-width:none with body overflow:auto, a main-page wheel movement from 0 to 894px, and a product-menu wheel movement to 380px. 390px/768px iframe layouts were inspected; physical touch devices, Firefox and Safari were not tested. Native wheel/touch/keyboard handlers are unchanged. Temporary QA pages were removed.

The release gate is BLOCKED: npm audit reports one critical vulnerability affecting the existing next@16.3.8 (reported affected range 16.0.0–16.4.0, proposed fix 16.4.2). Dependency updates are outside the approved scrollbar-only scope. No production publication or VPS deployment is authorized by this report. A successful local build/smoke does not establish real database/provider readiness or deployment to ibex.mn. GitHub publication, Sites publication and the owner's Node/VPS deployment are separate operations.

Separate VPS standalone build and bounded HTTP smoke also passed. GitHub publication was attempted on iBeX-Development/eam-ibex-home-web, but branch creation returned HTTP 403 Resource not accessible by integration. No branch/PR/merge was created by that failed request. The Organization integration needs repository Contents write access before retrying.

## Owner-authorized publication exception

After initially retaining V87, the owner explicitly instructed publication of V88 without upgrading Next.js. Next.js remains 16.3.8; the critical npm audit finding remains unresolved and the overall quality:vps gate is not described as passed. The previously saved and tested V88 artifact (source f9a1510c03dd9f0f6cfe30d47618789cf8bdb42e) was deployed successfully to Sites as deployment appgdep_6adb43e2fbe481919f0f201164cb87cf. This instruction supersedes the earlier publication hold recorded above. GitHub branch creation was retried and again returned HTTP 403; GitHub and the owner's VPS deployment are not claimed complete.
