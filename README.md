# iBeX Home Web

iBeX product website, website accounts and subscriptions, signed-in Home AI, and administrator-only Marketing AI.

## Supported deployments

- Sites / Cloudflare: D1 and R2 bindings, `npm run build`.
- Ubuntu / VPS: Node.js, PostgreSQL and S3-compatible storage, `npm run build:vps`; follow `docs/vps-migration/deployment-runbook.md`.
- Run `npm run quality:vps` before a VPS release. A build or an unconfigured smoke test does not verify real database, email, SMS, payment or AI credentials.

## Application ownership

`app/api/` owns authorization, validation, budget and persistence. `app/lib/` contains domain rules. `public/concept.html` and its ordered enhancement scripts render the public site; `app/account/` is the signed-in customer experience. Keep customer text bilingual and separate from administrator diagnostics. Read `RELEASE-GOVERNANCE.md` before changing accepted behavior.

Home AI requires a website session and is available from My iBeX. It cannot perform external actions or read core tenant data. Marketing AI remains administrator-only with outbound delivery and spend execution locked.

## Retention maintenance

VPS runs retention at startup and hourly using a process-local, ephemeral maintenance credential. It deletes expired chat history globally and cleans up up to 50 due accounts per run, including private profile objects. Storage deletion failures retain the database pointer for retry. Cloudflare exports a `scheduled` handler and an hourly request-triggered backstop; the hosting operator must attach an hourly cron trigger for cleanup during complete site inactivity. Do not claim the backstop is an unattended scheduler.

## Public interface scripts

Existing public enhancements form an ordered rendering pipeline. Do not reorder them or add another wrapper for a global renderer without a browser regression check. New domain rules belong in tested modules. A broad rewrite of this pipeline is a separate migration; this release makes bounded fixes.


## Prerequisites

- Node.js `>=22.13.0`
- Linux with `flock`, `curl`, and GNU `timeout`

## Sites Lifecycle

The Sites lifecycle CLI runs the locked dependency install before returning this checkout. Edit the source under `app/`, then checkpoint when a coherent milestone is ready to inspect or share. The remote Sites builder runs `npm run build` against the pushed commit. Do not repeat install or build as a normal pre-checkpoint step.

This starter does not use `wrangler.jsonc`.

`install:ci` is intentionally a single, non-retrying `npm ci`. It refuses a concurrent install for the same project, consumes a matching image-seeded npm cache with `--prefer-offline` while retaining registry fallback for a missing cache object, otherwise downloads and verifies the complete vinext tarball recorded in `package-lock.json`, limits npm to one socket, and terminates a stalled install. `build` applies a short timeout and then validates the Sites artifact. These helpers target Linux and use GNU `timeout`; they are not native macOS scripts.

Scripts that need writable project-scoped home, npm, XDG, and temporary paths use `scripts/sites-env.sh`. The `dev` and `start` scripts honor the caller's runtime environment and keep Wrangler logs inside the checkout. The generated `.sites-runtime/` directory is disposable and ignored by Git.

## Included Shape

- edit site code under `app/`
- `app/chatgpt-auth.ts` provides optional dispatch-owned ChatGPT sign-in helpers
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/index.ts` reads the D1 binding from the Cloudflare Worker environment
- `db/schema.ts` and `db/schema.postgres.ts` define the application schemas
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

OpenAI workspace sites can read the current user's email from
`oai-authenticated-user-email`.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs
optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send
  anonymous visitors through Sign in with ChatGPT.
- Use `chatGPTSignInPath(returnTo)` and `chatGPTSignOutPath(returnTo)` for
  browser links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in
  or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because
  they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the
OAuth cookies, and identity header injection. Do not implement app routes for
those reserved paths. Routes that do not import and call the helper remain
anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the
Sites hosting platform's access policy controls for workspace-wide restrictions,
or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write
actions tied to the current ChatGPT user. Leave public content anonymous.

## Diagnostic Commands

- `npm run install:ci`: perform the one bounded lockfile install
- `npm run dev`: start the Vite/Vinext development server
- `npm run build`: build and validate the deployable Sites artifact
- `npm run start`: start the built Vinext application
- `npm test`: build, validate, and verify the rendered development-preview metadata
- `npm run validate:artifact`: recheck an existing artifact's manifest and ESM `default.fetch` export
- `npm run db:generate`: generate Drizzle migrations after schema changes

## iBeX Home AI R1

The public Home AI is a customer assistant, not a marketing system or iBeX Hybrid
Intelligent AI or the industrial System AI. Its server route reads only approved
public website knowledge. Raw chat text is not written to D1; D1 stores hashed
subjects, explicit AI-service consent, aggregate usage and privacy-safe audit
metadata in the isolated `customer_ai_*` tables.

Configure `OPENAI_HOME_API_KEY` and `HOME_AI_ID_HASH_SALT` as server-side Site
secrets. Home AI control stores its mode, model routing, request limits,
app-side cost guard and dynamic fair-share settings in D1. Marketing AI uses a
different `OPENAI_MARKETING_API_KEY`; the industrial Intelligent AI uses
`OPENAI_INTELLIGENT_API_KEY`. Also set an independent OpenAI project spend
limit for every AI as the authoritative hard stop. Never put a real API key in
source, a public repository or browser code.

R1 does not send emails, publish social posts, launch campaigns or modify iBeX
tenant data. Customer handoff is a visible proposal; outbound tools remain
blocked until a separately approved release adds channel credentials, consent,
administrator approval and delivery audit.

Use build and validation commands for targeted diagnosis after a remote failure, not as part of the normal checkpoint path.

The timeout defaults can be overridden for a controlled canary with `SITES_INSTALL_TIMEOUT`, `SITES_INSTALL_KILL_AFTER`, `SITES_BUILD_TIMEOUT`, and `SITES_BUILD_KILL_AFTER`. A timeout fails the command; the helpers never retry an unchanged install or build.

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
