# Diong Production Deployment — Pass 8, Step 4

The authoritative, current deployment guide. `docs/DEPLOYMENT.md` is an
earlier-pass document written when Diong shipped only Daily Prime and
Connections (6 migrations) — it is superseded by this file, which reflects
the full current feature set (social graph, posts, communities, direct
messages, goals/habits/journal, media, PWA, search performance — 15
migrations).

This document answers one question: **can Diong be safely deployed to
Vercel against the existing Supabase production project?** Answer:
**READY WITH MANUAL CONFIGURATION** — see the release gate at the end of
this Pass 8 step's final report for the full breakdown. Nothing here was
executed as part of writing this document; no deploy, migration run, or
Supabase configuration change was made.

## 1. Prerequisites

- A Supabase project with all 15 migrations in `supabase/migrations/`
  already applied, in order (confirmed applied as of this step — see §6).
- A Vercel account with access to import this Git repository.
- Node.js 22+ locally if building/testing outside Vercel (`.nvmrc` = `22`,
  `package.json` `engines.node: ">=22"`).
- A production domain (or Vercel's own `*.vercel.app` domain is fine for a
  soft launch) — this document uses `https://YOUR-DIONG-DOMAIN.com` as a
  placeholder throughout; no real domain has been chosen yet, so none is
  invented here.

## 2. Required environment variables

Diong uses exactly two environment variables, both intentionally public
(exposed to the browser) — confirmed by grepping the entire codebase for
every `process.env.` reference:

| Variable | Used in | Public? | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `src/lib/supabase/{client,server,proxy}.ts`, `src/lib/media/media-url.ts` | Yes | Supabase project URL — also used to build public Storage media URLs |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `src/lib/supabase/{client,server,proxy}.ts` | Yes | Supabase publishable ("anon") key |

`NODE_ENV` is also read once (`src/components/pwa/service-worker-registration.tsx`,
to gate service-worker registration to production only) — this is a
framework-managed built-in, never set manually; Vercel sets it automatically.

**No other environment variable exists anywhere in this codebase.** In
particular: **no Supabase service-role key is used, referenced, or needed,
anywhere** — confirmed by grepping for `SERVICE_ROLE`/`service_role` across
the whole repo (zero matches). `.env.example` already documents both
variables with placeholder values only, and matches `.env.local`'s variable
names exactly (values were not inspected or printed — only names).

**Rules enforced / to keep enforcing:**
- Never commit `.env.local` — `.gitignore` already excludes it; `git status`
  confirms it is untracked.
- Never add a service-role key as `NEXT_PUBLIC_*` (or at all) — nothing in
  the app calls for one.
- Set both variables for **both** Vercel Production and Preview environments
  (Project → Settings → Environment Variables). Development (local) uses
  `.env.local`, never committed.
- If Preview deployments should hit a separate/staging Supabase project,
  give Preview its own values instead of reusing Production's.

## 3. Vercel project setup

| Setting | Value |
| --- | --- |
| Framework preset | Next.js (auto-detected) |
| Build command | `npm run build` (i.e. `next build`) |
| Output | Next.js default (`.next`) — no custom output config in `next.config.ts` |
| Install command | `npm install` (default) |
| Node.js version | 22.x (Project → Settings → Build & Deployment → Node.js Version) |
| Root directory | Repository root (no monorepo subfolder) |

`next.config.ts` has no `output: "export"`/`"standalone"` override and no
custom `distDir` — the Vercel defaults apply directly.

## 4. Supabase Auth URL configuration

Every auth redirect in this app is built dynamically from the incoming
request's `origin` header (`app/(auth)/actions.ts` — `register()` and
`requestPasswordReset()` both do `const origin = (await headers()).get("origin")`
and build `emailRedirectTo`/`redirectTo` from it) — **no domain is
hardcoded anywhere in the application code.** The only place a production
domain needs to be configured is in Supabase itself:

Supabase dashboard → **Authentication → URL Configuration**:

- **Site URL**: `https://YOUR-DIONG-DOMAIN.com` — used by Supabase as the
  base URL in confirmation/reset emails when a request has no usable origin.
- **Redirect URLs** (allow-list — a URL not on this list is rejected and the
  user lands on `/login?error=callback`):
  ```
  https://YOUR-DIONG-DOMAIN.com/auth/callback
  http://localhost:3000/auth/callback
  ```
  If Vercel Preview deployments will also complete auth flows, Supabase
  supports a wildcard pattern for those, e.g.
  `https://your-project-*.vercel.app/auth/callback` — optional, add only if
  Preview auth testing is actually needed; not required for a Production
  launch.

`app/auth/callback/route.ts` (`GET`) exchanges the Supabase `code` for a
session cookie, then redirects to `next` **only if it's a local path**
(`safeNext()` rejects anything not starting with `/`, and rejects `//...`
to block a protocol-relative open redirect) — otherwise to `/home`. On any
exchange failure it redirects to `/login?error=callback`, never exposing
the underlying error. Registration sends users to
`…/auth/callback?next=/onboarding`; password reset to
`…/auth/callback?next=/reset-password`.

**Email templates**: decide whether "Confirm email" is required
(Authentication → Providers → Email). If enabled, a new user must click the
emailed link before a session exists — the app already handles this
gracefully (`"Check your email to confirm your account, then continue to
onboarding."`). Confirm the **Confirm signup** and **Reset password**
templates use the production Site URL once it's set (the default
`{{ .SiteURL }}` template variable picks this up automatically). For any
real email volume, configure custom SMTP (Auth → SMTP) — Supabase's
built-in mailer is rate-limited and meant for development.

## 5. Build process

```bash
npm ci
npm test
npm run lint
npx tsc --noEmit -p tsconfig.json
npm run build
```

All five must pass on the release commit — this is exactly what was run
for this step (see the Pass 8 Step 4 final report for results) and should
be re-run on whatever commit is actually deployed. Vercel itself only runs
`npm install` + `npm run build`; running the full sequence locally first
catches lint/type errors before they reach a deploy.

## 6. Migration state

All 15 migrations in `supabase/migrations/` are applied, in order, to the
Supabase production project (confirmed by the user; the most recent,
`202609140001_search_and_profile_read_performance.sql`, was manually
verified per its own documented verification queries in
`docs/DATABASE_PERFORMANCE.md` §10):

1. `202607190001_onboarding_and_profiles.sql`
2. `202607270001_prime_protocol_engine.sql`
3. `202609060001_connections.sql`
4. `202609060002_connection_rpcs.sql`
5. `202609080001_fix_daily_prime_assigned_date.sql`
6. `202609100001_prime_reflections.sql`
7. `202609100002_social_graph.sql`
8. `202609100003_social_content.sql`
9. `202609100004_notifications_discover_search.sql`
10. `202609120001_fix_social_profile_username.sql`
11. `202609120002_direct_messages.sql`
12. `202609120003_communities.sql`
13. `202609130001_goals_habits_journal.sql`
14. `202609130002_media_profile_polish.sql`
15. `202609140001_search_and_profile_read_performance.sql`

**No new migration was created in this step.** Nothing in Step 4 required a
database change — this step is application/deployment configuration only.
`README.md` and `docs/MEDIA_PROFILE_STORAGE.md`/`docs/DATA_MODEL.md`
previously described migrations 14–15 as "written, not yet applied"; that
was stale as of this step and has been corrected to reflect the applied
state confirmed at the start of Step 4.

Every migration file is a single `begin … commit` transaction and is
**not** idempotent — never re-run one that already succeeded.

## 7. PWA production notes

Re-verified from Pass 8 Step 1, unchanged:

- `public/sw.js` caches **only** three fixed static paths
  (`/manifest.webmanifest`, `/icons/icon-192`, `/icons/icon-512`) — every
  other request, including all Supabase RPC calls and every authenticated
  page, passes straight through. No private/authenticated data is ever
  cached.
- `src/components/pwa/service-worker-registration.tsx` registers the
  service worker **only when `NODE_ENV === "production"`** — it will not
  register during local `next dev`, only in a production build/deploy.
- `app/manifest.ts` (served at `/manifest.webmanifest`) and the four
  code-generated icon routes (`/icon`, `/apple-icon`, `/icons/icon-192`,
  `/icons/icon-512`) require no environment configuration — they're pure
  code, verified working via a local production build in Step 1.
- Icons are a code-generated placeholder monogram (see
  `docs/PWA_PERFORMANCE.md` for the production icon set still needed
  before a polished public launch — not a functional blocker, a design
  polish item).

## 8. Security notes

- **No secrets in the client bundle.** Both env vars are intentionally
  public; no service-role key exists anywhere in the codebase (§2).
- **Server/client boundary**: `src/lib/supabase/server.ts` and `proxy.ts`
  use `next/headers`/request cookies and have no `"use client"` directive —
  Next.js's bundler would hard-fail the build if a client component ever
  imported them, and the build succeeds, which is itself a build-time proof
  no such import exists.
- **Error handling**: every error boundary (`app/error.tsx`,
  `app/(protected)/error.tsx`, `app/global-error.tsx`) shows only a static,
  generic message and never renders the caught `error.message` or
  `error.digest` — the raw error is passed only to `console.error` (server
  logs). Server Actions map every Supabase/Postgres error to a small
  allow-listed set of safe strings before returning it to the client
  (audited exhaustively in Pass 8 Step 3; one real gap found and fixed
  there — see `docs/DATABASE_PERFORMANCE.md` §Part B equivalent in the UX
  doc, or the Step 3 conversation record).
- **Auth redirects**: `safeNext()` in `app/auth/callback/route.ts` rejects
  any `next` target that isn't a same-origin relative path, closing an open
  redirect vector.
- **Production security headers** (`next.config.ts`, added this step):
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: strict-origin-when-cross-origin`, and a
  `Permissions-Policy` disabling camera/microphone/geolocation/FLoC
  (verified unused anywhere in the app before disabling). Deliberately
  **no Content-Security-Policy** — see below.
- **Why no CSP yet**: a strict CSP needs to be verified against Next's own
  hydration scripts, Tailwind's inline `style` attribute usage (e.g. the
  `Avatar` component sizes itself via inline `style={{ width, height }}`,
  which needs `style-src 'unsafe-inline'` or a nonce-based setup), the
  Supabase project's specific origin (only known once a project is chosen —
  `connect-src` would need `https://<project-ref>.supabase.co`), and the
  service worker registration — all of which require live-browser testing
  this environment cannot do. Shipping an unverified CSP risks silently
  breaking auth, images, or the PWA rather than adding safety. **Recommended
  first CSP to test post-deploy** (verify in a real browser, watch the
  console for violations, before enabling in production):
  ```
  default-src 'self';
  img-src 'self' data: blob: https://*.supabase.co;
  connect-src 'self' https://*.supabase.co;
  style-src 'self' 'unsafe-inline';
  script-src 'self';
  frame-ancestors 'none';
  ```
  (`img-src` needs `blob:` for the post-image-picker's local upload preview,
  and `https://*.supabase.co` for Storage-hosted avatars/covers/post
  images; `connect-src` needs the Supabase origin for every RPC call.)

## 9. Deployment procedure

1. Push the release commit to the Git remote (not done as part of this
   step — Step 4 explicitly does not commit or push).
2. Vercel → **Add New → Project → Import Git Repository** → select this repo.
3. Confirm the auto-detected settings match §3 (Framework: Next.js, Build:
   `npm run build`, Node: set to 22.x explicitly).
4. Add both environment variables (§2) for **Production** and **Preview**.
5. Deploy.
6. Copy the resulting production URL (or attach the custom domain first,
   then use that).
7. Supabase dashboard → Authentication → URL Configuration → set **Site
   URL** and add the production `/auth/callback` URL to **Redirect URLs**
   (§4) using the real URL from step 6.
8. If the domain was only just attached/changed, redeploy once so any
   build-time assumptions pick it up (this app has none — no domain is
   baked into the build — but redeploying after a Supabase Auth URL change
   is good practice to force a clean state).
9. Run the post-deployment smoke test (§10 below, also captured in
   `docs/RELEASE_CHECKLIST.md`).

## 10. Post-deployment smoke test

Against the live production URL, with a real signed-in test account:

- [ ] `/` renders; register → onboarding → `/home`.
- [ ] `/login`, logout, and a full password-reset round trip all work end
      to end (request → email link → `/auth/callback` → `/reset-password`
      → new password → log in).
- [ ] `/home` loads and shows interests (exercises the new
      `get_interest_names()` RPC from Step 3 — this is the one path whose
      correctness in production hadn't been observable until the migration
      was applied).
- [ ] A public profile (`/profile/[username]`) loads and shows interests
      for another account.
- [ ] `/search` returns results for a 2+ character query across people,
      posts, and communities (exercises the new trigram indexes).
- [ ] `/feed`, `/discover` load and show posts with avatars/media.
- [ ] `/communities` and a specific `/communities/[slug]` load, including
      its post feed.
- [ ] `/messages` loads the conversation list; opening one loads messages.
- [ ] `/goals`, `/habits`, `/journal` each load and a create form submits.
- [ ] `/settings/profile` loads; an avatar/cover upload round-trips through
      Storage and displays.
- [ ] `/manifest.webmanifest` returns the manifest JSON; `/sw.js` returns
      200 (not 404).
- [ ] An unknown URL while signed in shows the branded, header-intact 404;
      while signed out shows the root branded 404.
- [ ] At ~375px width: the new mobile menu button opens/closes the nav,
      Escape closes it, and no route shows horizontal scroll.

No destructive actions (deletions, bans, irreversible state changes)
should be part of this pass — read + one harmless create per surface is
enough to prove the read/write path works end to end.

## 11. Rollback / recovery guidance

- **Application**: Vercel → Deployments → promote the previous successful
  deployment to Production. Instant, safe, and does not touch the database.
- **Database**: every migration in this repo is additive — rolling the app
  back does not require rolling back a migration. If a specific migration
  ever needs reversing, the newest one (`202609140001_...`) is uniquely
  low-risk to reverse manually if ever needed:
  ```sql
  begin;
  drop function if exists public.get_interest_names(uuid);
  drop index if exists public.communities_description_trgm_idx;
  drop index if exists public.communities_slug_trgm_idx;
  drop index if exists public.communities_name_trgm_idx;
  drop index if exists public.posts_body_trgm_idx;
  drop index if exists public.profiles_bio_trgm_idx;
  drop index if exists public.profiles_display_name_trgm_idx;
  drop index if exists public.profiles_username_trgm_idx;
  commit;
  ```
  (Leaves `pg_trgm` installed — harmless to leave, drop the extension too
  only if nothing else ever comes to depend on it.) Reversing this would
  also require reverting `src/lib/profile-data.ts` to its pre-Step-3
  two-query form, since it now calls `get_interest_names()` directly.
  Earlier migrations' rollback blocks (where documented) live in their own
  feature docs, e.g. `docs/CONNECTIONS_SETUP.md`.
- Never drop `auth.users` or the shared `public.set_updated_at()` /
  `public.blocked_between()` helper functions — many RPCs across multiple
  passes depend on them.
