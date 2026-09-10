# Diong Deployment

Target platform: **Next.js on Vercel + Supabase**. This document is the
human-run procedure. Nothing here is automated by the app.

---

## 1. Node version

Diong requires **Node.js 22 or later** (`package.json` `engines.node: ">=22"`,
`.nvmrc` = `22`). `@supabase/supabase-js` drops Node 20 support.

- **Local:** `nvm use` (or install Node 22+).
- **Vercel:** Project → Settings → Build & Deployment → **Node.js Version → 22.x**.
  Confirm the deploy log shows Node 22.

## 2. Vercel project setup

1. Import the Git repository into Vercel.
2. Framework preset: **Next.js** (auto-detected).
3. Build command: `next build` (default). Output: `.next` (default).
4. Install command: `npm install` (default).
5. Set the Node version to 22.x (step 1).
6. Do **not** commit any `.env*` file — configure env vars in the dashboard
   (step 3).

## 3. Production and Preview environment variables

Set both variables for **Production** and **Preview** (Project → Settings →
Environment Variables):

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL, e.g. `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable ("anon") key |

Both are public by design. **Never** add the Supabase service-role key — Diong
does not use it.

If Preview deployments should point at a separate Supabase project, give Preview
its own values.

## 4. Supabase Site URL

Supabase dashboard → **Authentication → URL Configuration → Site URL**:

- Production: `https://<your-production-domain>`

This is the base URL Supabase uses in confirmation and password-reset emails
when a request has no usable `origin`.

## 5. Supabase redirect allow-list

Same screen → **Redirect URLs** — add every origin that will complete an auth
flow:

```
https://<your-production-domain>/auth/callback
https://<your-production-domain>/**
https://<preview-domain-or-pattern>/auth/callback   (if Preview auth is used)
http://localhost:3000/auth/callback                 (local dev)
```

A redirect URL that is not on this list is rejected by Supabase and the user
lands on `/login?error=callback`.

## 6. `/auth/callback` expectations

- Route: `app/auth/callback/route.ts` (GET).
- It exchanges the Supabase `code` for a cookie session, then redirects to the
  `next` query param **only if** `next` is a local path (`/…`, not `//…`);
  otherwise to `/home`.
- On any failure it redirects to `/login?error=callback`.
- Registration sends users to `…/auth/callback?next=/onboarding`.
- Password reset sends users to `…/auth/callback?next=/reset-password`.
- Both `next` targets must resolve on the production domain.

## 7. Email confirmation / reset URL considerations

Supabase dashboard → **Authentication → Providers → Email**, and **Email
Templates**:

- Decide whether **"Confirm email"** is required. If it is, a new user must
  click the emailed link before `data.session` exists; Diong shows
  *"Check your email to confirm your account, then continue to onboarding."*
- Ensure the **Confirm signup** and **Reset password** templates use the
  production Site URL (default `{{ .SiteURL }}` / `{{ .ConfirmationURL }}` is
  fine once Site URL is correct).
- For real email delivery at any volume, configure **custom SMTP** (Settings →
  Auth → SMTP). The built-in Supabase mailer is rate-limited and intended for
  development.

## 8. Migration order

Apply once, in this order, to the production project (Supabase CLI
`supabase db push`, or the SQL Editor, one file at a time):

1. `202607190001_onboarding_and_profiles.sql`
2. `202607270001_prime_protocol_engine.sql`
3. `202609060001_connections.sql`
4. `202609060002_connection_rpcs.sql`
5. `202609080001_fix_daily_prime_assigned_date.sql`
6. `202609100001_prime_reflections.sql`

Each is a single `begin … commit` transaction and is **not** idempotent. Do not
re-run a migration that already succeeded. After migration 6, run its
verification queries (see `docs/DAILY_PRIME_HISTORY.md`).

## 9. Build command

Vercel: `next build` (default). Locally verify before every release:

```bash
npm ci
npm test
npm run lint
npm run build
```

All three must pass on the release commit.

## 10. Post-deploy smoke tests

On the deployed production URL, with a fresh email address:

1. `/` renders; "Start free" → `/register`; footer "Privacy" / "Terms" open.
2. Register → (confirm email if required) → land on `/onboarding`.
3. Complete onboarding (username, display name, 1–5 interests) → land on `/home`.
4. `/home` shows the welcome, the Daily Prime card, interests, and the
   Connections section.
5. `/daily-prime` → read the Prime → "Mark Action Trigger complete".
6. Reflection card appears → save a reflection → reload → it persists.
7. `/daily-prime/history` lists today's Prime with "Reflection saved"; progress
   numbers are correct.
8. Open the history row → detail renders read-only; visit
   `/daily-prime/history/abc` and `/daily-prime/history/999999` → branded 404.
9. `/connections` → add a connection → detail → record an interaction → history
   updates → deactivate → reactivate.
10. `/settings/profile` → change display name → save → reflected on `/home`.
11. Log out → protected routes redirect to `/login`; log back in → `/home`.
12. Force a not-found URL (`/nope`) → branded 404, not a framework page.
13. Mobile ~375px: no horizontal scroll on `/`, `/daily-prime`, `/connections`.

## 11. Rollback guidance

- **Application:** in Vercel → Deployments, **promote the previous successful
  deployment** to Production. This is instant and safe; it does not touch the
  database.
- **Database:** migrations are additive. Rolling the app back does **not**
  require rolling back a migration. If a specific migration must be reversed,
  follow the rollback SQL in that feature's doc (`docs/CONNECTIONS_SETUP.md`
  has explicit rollback blocks for the Connections migrations). The
  `202609100001_prime_reflections.sql` reflection column and function can be
  dropped with:

  ```sql
  begin;
  drop function if exists public.save_prime_reflection(bigint, text);
  alter table public.prime_completions drop constraint if exists prime_completions_reflection_length;
  alter table public.prime_completions drop column if exists reflection;
  commit;
  ```

  Dropping the column deletes stored reflections — back up first, and revert the
  app code that calls `save_prime_reflection` beforehand.
- Never drop `auth.users` or the shared `public.set_updated_at()` function.
