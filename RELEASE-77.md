# Version 77

- Restored Home AI Published Prompt ID with optional version and an explicit Published Prompt / Code-managed fallback selector.
- Added a fail-closed Published Prompt activation gate: the exact saved ID and version must pass the admin connection test before Production can be enabled.
- Preserved general OpenAI knowledge and optional iBeX references without restoring the former Approved + Public response gate.
- Added explicit Prompt not found, invalid version, incomplete output, authentication, access, rate-limit and timeout errors.
- Added select-all controls and unsaved-change protection to administrator permission management.
- Added an approved-feature registry and enforceable release-governance regression gate covering retained v55–v76 behavior.
