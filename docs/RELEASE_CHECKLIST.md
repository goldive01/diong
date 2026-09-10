# Diong V1 Release Checklist

Practical launch checklist. Tick every box before promoting to Production.
See `docs/DEPLOYMENT.md` for the how-to.

## Code

- [ ] `npm ci` clean on Node 22
- [ ] `npm test` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` passes on the release commit
- [ ] No `TODO` / `FIXME` / `mock` / `demo` / `placeholder` / `href="#"` in shipped code (audit)
- [ ] Landing page advertises only shipped V1 features (no Goals / Habits / Journal / Community / Notifications / AI as available)
- [ ] Metadata (`app/layout.tsx`) describes the shipped product
- [ ] `/privacy` and `/terms` render and are linked from the footer and the register form
- [ ] Branded `not-found`, `global-error`, protected `error` and `loading` states in place

## Database (Supabase)

- [ ] All 6 migrations applied in order to the production project
- [ ] `202609100001_prime_reflections.sql` verification queries pass (see `docs/DAILY_PRIME_HISTORY.md`)
- [ ] RLS enabled on `profiles`, `interests`, `user_interests`, `prime_*`, `connections`, `connection_interactions`
- [ ] No `anon` write access; `authenticated` grants are column-scoped or RPC-only
- [ ] Service-role key is **not** present in any deploy environment

## Supabase Auth

- [ ] Site URL set to the production domain
- [ ] Redirect allow-list includes `https://<domain>/auth/callback` (+ Preview + localhost as needed)
- [ ] "Confirm email" setting decided; confirmation + reset templates use the production Site URL
- [ ] Custom SMTP configured (or the built-in mailer's limits accepted for a soft launch)

## Vercel

- [ ] Node.js version set to 22.x; deploy log confirms it
- [ ] `NEXT_PUBLIC_SUPABASE_URL` set for Production and Preview
- [ ] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` set for Production and Preview
- [ ] Production domain attached and HTTPS active
- [ ] `.env.local` / secrets are **not** in the repo (`git ls-files | grep env` → only `.env.example`)

## Post-deploy smoke test (production URL, fresh account)

- [ ] Landing renders; "Start free" → `/register`; footer legal links work
- [ ] Register → onboarding → home
- [ ] Daily Prime: read → complete Action Trigger
- [ ] Reflection: save → reload → persists
- [ ] Prime history + progress correct; `/daily-prime/history/abc` → branded 404
- [ ] Connections: create → interaction → history → deactivate → reactivate
- [ ] Profile settings update reflected on `/home`
- [ ] Logout → protected routes redirect to `/login`; login → `/home`
- [ ] Unknown URL → branded 404
- [ ] Mobile ~375px: no horizontal scroll on key routes

## Monitoring / operations

- [ ] Error monitoring configured (Vercel logs at minimum; Sentry recommended)
- [ ] Rollback path confirmed (promote previous Vercel deployment)
- [ ] Someone owns the launch window and can watch logs

## Known deferred (not blockers)

- Standalone Goals / Habits / Journal → V1.1
- Community / social feed, notifications, AI Coach → later
- In-app password change, account deletion, `/settings` index → V1.1
- Automated e2e test suite → V1.1
- Per-user time zone (Daily Prime + Connections use UTC calendar days) → V1.1
