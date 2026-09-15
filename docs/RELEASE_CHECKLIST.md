# Diong Release Checklist

Practical launch checklist for the current, full feature set (Daily Prime,
social graph, posts/feed, communities, direct messages, goals/habits/
journal, media, PWA). See `docs/PRODUCTION_DEPLOYMENT.md` for the full
how-to behind every item here; `docs/DEPLOYMENT.md` is superseded.

## Before deployment

- [ ] `npm ci` clean on Node 22
- [ ] `npm test` passes
- [ ] `npm run lint` passes
- [ ] `npx tsc --noEmit -p tsconfig.json` passes
- [ ] `npm run build` passes on the release commit
- [ ] No `TODO` / `FIXME` / `mock` / `demo` / `placeholder` / `href="#"` in shipped code (audit)
- [ ] Landing page and metadata (`app/layout.tsx`) describe only shipped V1 features
- [ ] `/privacy` and `/terms` render and are linked from the footer and the register form
- [ ] All 15 migrations applied, in order, to the target Supabase project (see `docs/PRODUCTION_DEPLOYMENT.md` §6)
- [ ] `.env.local` / secrets are **not** in the repo (`git ls-files | grep env` → only `.env.example`)
- [ ] `.env.example` documents every variable the app actually reads (currently exactly 2 — see `docs/PRODUCTION_DEPLOYMENT.md` §2)

## Deploy

- [ ] Vercel → Import Git Repository → this repo selected
- [ ] Framework preset: Next.js (auto-detected)
- [ ] Build command: `npm run build`; output: Next.js default
- [ ] Node.js version explicitly set to 22.x — deploy log confirms it
- [ ] `NEXT_PUBLIC_SUPABASE_URL` set for Production and Preview
- [ ] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` set for Production and Preview
- [ ] No service-role key added anywhere in Vercel env config (not needed — confirm, don't just assume)
- [ ] Deploy triggered; build succeeds; production URL copied
- [ ] Production domain attached and HTTPS active (or `*.vercel.app` accepted for a soft launch)

## Supabase configuration

- [ ] Site URL set to the production domain (Authentication → URL Configuration)
- [ ] Redirect allow-list includes `https://<domain>/auth/callback` (+ `http://localhost:3000/auth/callback` for local dev; Preview pattern only if Preview auth is actually tested)
- [ ] "Confirm email" setting decided; confirmation + reset templates use the production Site URL
- [ ] Custom SMTP configured (or the built-in mailer's rate limits accepted for a soft launch)
- [ ] RLS enabled on every user-owned table (spot-check a few: `profiles`, `posts`, `messages`, `goals` — all should show RLS on in the Supabase table editor)
- [ ] No `anon` write access anywhere; `authenticated` grants are column-scoped or RPC-only
- [ ] `diong-public-media` Storage bucket exists with its documented `allowed_mime_types`/`file_size_limit` (see `docs/MEDIA_PROFILE_STORAGE.md`)
- [ ] Redeployed once after any Supabase Auth URL change, to be safe

## After deployment

- [ ] Error monitoring in place (Vercel function logs at minimum; a dedicated error tracker recommended but not required for V1)
- [ ] Rollback path confirmed (Vercel → Deployments → promote previous deployment)
- [ ] Someone owns the launch window and watches logs for the first stretch after going live

## Auth test

- [ ] Register (new email) → onboarding → `/home`
- [ ] Log out → protected routes redirect to `/login`
- [ ] Log back in → `/home`
- [ ] Request a password reset → email link → `/auth/callback` → `/reset-password` → set new password → log in with it
- [ ] An invalid/expired auth callback redirects to `/login?error=callback`, no raw error shown
- [ ] Visiting a protected route signed out redirects to `/login`, not a crash or blank page

## Media test

- [ ] Profile avatar upload → displays on `/home`, profile page, and anywhere else the avatar appears (comments, nav, etc.)
- [ ] Profile cover upload → displays on the profile page
- [ ] Attach up to 4 images to a post → displays in the feed and on the post detail page, correct order
- [ ] Community avatar/cover upload (as owner) → displays on the community page and in community cards
- [ ] Remove an image from a draft/edit → it's gone after save

## Social test

- [ ] Create a post → appears in `/feed`
- [ ] Like, comment, and reply on a post; edit and delete your own comment (with confirm step)
- [ ] Follow/unfollow a person; block/unblock a person (with confirm step) and confirm blocked content disappears both directions
- [ ] `/discover` and `/search` (2+ character query) return people, posts, and communities
- [ ] Bookmark a post → appears on `/saved`
- [ ] Create a community, post in it, and (as owner) remove a post / ban a member — each destructive action requires its confirm step
- [ ] Send a direct message; confirm it appears for the recipient and the unread badge updates
- [ ] Trigger a notification (e.g. have a second account like/comment/follow) → appears on `/notifications` and its link routes correctly

## Personal-development test

- [ ] Daily Prime: read today's Prime → complete the Action Trigger → save a reflection → reload → it persists
- [ ] `/daily-prime/history` lists today's Prime; opening a past entry works; an invalid id shows the branded 404
- [ ] Create a goal, add a milestone, mark it complete
- [ ] Create a habit, check in for today, confirm the streak updates
- [ ] Write a journal entry, optionally linked to a goal/habit/Prime assignment; edit and delete it (delete has its own confirm step)
- [ ] None of Goals/Habits/Journal ever appear in the feed, Discover, Search, a public profile, communities, or messages

## PWA test

- [ ] `/manifest.webmanifest` returns valid JSON with Diong's name/colors/icons
- [ ] `/sw.js` returns 200, not 404
- [ ] `/icon`, `/apple-icon`, `/icons/icon-192`, `/icons/icon-512` all resolve
- [ ] In a production build (not `next dev`), the service worker registers and installs without error
- [ ] No authenticated page or Supabase response is ever served from the service worker's cache (spot-check: go offline after loading `/feed`, confirm it does *not* silently show stale content — a network error is the correct behavior here)

## Security test

- [ ] Response headers on the production URL include `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`
- [ ] No service-role key or other secret appears in the deployed page source, a Network tab request, or any client bundle (view-source / dev tools check)
- [ ] Force a server error (if practical) and confirm the error boundary shows only generic copy — no stack trace, no raw Postgres/Supabase text
- [ ] Visit another user's private/blocked content directly by URL → branded 404, not an "access denied" message that would confirm the content exists
- [ ] Mobile ~375px: the new mobile nav menu opens/closes correctly, Escape closes it, no horizontal scroll on `/home`, `/feed`, `/profile/[username]`, `/communities/[slug]`, `/messages`, `/goals`, `/habits`, `/journal`, `/settings/profile`

## Known deferred (not blockers)

- Content-Security-Policy — documented and recommended in `docs/PRODUCTION_DEPLOYMENT.md` §8, not enabled pending live-browser verification
- Designed production icon set (current icons are a code-generated placeholder monogram — see `docs/PWA_PERFORMANCE.md`)
- Push notifications, offline data sync — explicitly out of scope for the PWA foundation (`docs/PWA_PERFORMANCE.md`)
- Real-time messaging (current messaging is request/response, not WebSocket-based)
- Comment-thread pagination beyond the current hard 500-row cap (`docs/DATABASE_PERFORMANCE.md` §6)
- In-app password change / account deletion / a `/settings` index page
- Automated end-to-end test suite (current tests are unit tests over pure logic only)
- Per-user time zone (Daily Prime + Connections use UTC calendar days)
