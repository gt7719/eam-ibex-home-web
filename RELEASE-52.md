# Version 52

Version 52 preserves the Version 51 website-account architecture and all protected pricing and administration areas while improving the public account experience and creating the iBeX mobile-environment foundation.

## Approved changes

- Registration fits a normal desktop viewport at 100% browser zoom and remains vertically scrollable on mobile.
- The separate country field is removed. Calling code is auto-detected and can be changed from one dropdown.
- Passwords use a shared 8–128 character policy requiring an uppercase letter, a number and a special character. Registration and password reset use the same server-side validator.
- Day-mode contrast is strengthened for labels, policy consent, optional consent and login actions.
- Every public account page has a visible close control that returns to the home page.
- Registration is a separate header action beside Sign in. The Sign in dropdown contains website, core iBeX and administrator sign-in only.
- The protected iBeX environment entry now contains iBeX Web Environment and iBeX Mobile Environment.
- `/mobile` is a truthful foundation page for planned request creation, assigned-work execution and request-status tracking. These mobile actions are not presented as active in Version 52.

## Preserved boundaries

- Pricing, the current administration areas and existing iBeX Web Environment behavior are unchanged.
- No database schema migration is required.
- Email delivery still requires production provider configuration before end-to-end verification mail can be delivered.
