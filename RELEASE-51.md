# Version 51 — Website accounts v1.0

Version 51 starts from the approved Version 50 source and leaves Version 50 unchanged.

## Included

- Removes the duplicate Product, Solution, Industry and AI menu triggers while preserving the protected Pricing and iBeX Environment entries.
- Adds a separate public website-account registration, email verification, sign-in, sign-out, password recovery and account-deletion request flow.
- Requires full name, email, country-aware mobile number, password and explicit Terms/Privacy consent; records optional email and SMS marketing choices separately.
- Stores website users, sessions, hashed one-time tokens, consent history, delivery events, login attempts, future SMS verification records and future core-system access requests in D1.
- Adds independently permission-gated website-user status management to the existing administration hub.
- Keeps public website users isolated from both administrator identities and core iBeX tenant identities.
- Adds rate limits, same-origin enforcement, honeypot timing, generic account-discovery responses and optional Cloudflare Turnstile verification.

## Production configuration still required

- Configure `RESEND_API_KEY`, `EMAIL_FROM` and `EMAIL_REPLY_TO` after the sending domain has SPF/DKIM/DMARC records.
- Configure both `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` to enable the browser challenge and server verification together.
- The included Terms and Privacy pages are operational drafts and require legal approval before the site is opened to unrestricted public registration.

Without an email-provider key, account records are retained with `delivery_failed` status and the verification token is never exposed to the browser.
