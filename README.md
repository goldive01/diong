# Diong

**Prime your mind. Act on your goals. Become more.**

Diong is a calm, structured personal-development web application. It gives you a
daily practice — one structured Prime, a single focused Action Trigger and a
short reflection — together with a personal history and progress view and a
private space for the connections that matter to your growth.

Diong is a tool for attention, reflection, motivation, habits and purposeful
action. It does not provide medical, psychological or other professional advice
and makes no guaranteed-outcome claims.

## V1 capabilities

- Email registration, login, password reset, logout (Supabase Auth).
- Onboarding: username, display name, optional bio, and 1–5 growth interests.
- Authenticated app shell with a personal home dashboard.
- **Daily Prime** — one Prime Protocol assigned per user per day, weighted by
  your interests.
- **Action Trigger completion** — mark the day's action done (no duplicate
  completions).
- **Reflection** — an optional private note against today's completed Prime,
  editable the same day.
- **Prime history** — every assigned Prime, newest first.
- **Prime detail** — a read-only view of any past Prime and its saved reflection.
- **Prime progress** — real counts: Prime days, completed, completion rate, and
  simple current / longest day streaks.
- **Connections** — track the people who matter to your growth (friends, family,
  mentors, accountability partners, colleagues, collaborators, study partners
  and other important people): create, edit, record interactions, view history,
  deactivate / reactivate, and a home nudge for the connection most worth
  revisiting.
- Authenticated-visible public profile pages.
- **Social graph** — follow / unfollow, block / unblock, follower and following
  lists (paginated), follower / following counts on the public profile.
  Blocking is authoritative in the database: it removes any follow in either
  direction and refuses future ones. A member the owner has blocked cannot
  resolve that profile. (Social Network Pass 1 — `docs/SOCIAL_GRAPH_SETUP.md`.)
- **Social content** — a chronological growth feed at `/feed`: write a post
  (one of seven growth-centred types) with public / followers-only / private
  visibility; read your own posts plus public and followers-only posts from
  people you follow, 20 per page. Like, comment, reply once, and privately
  bookmark (`/saved`). Open a post at `/posts/<id>`; edit or soft-delete your
  own posts and comments. A Posts section on the public profile shows only what
  the viewer is authorised to see. Visibility and Pass 1 blocking are enforced
  in the database. No feed ranking, no view counts, no popularity metrics.
  (Social Network Pass 2 — `docs/SOCIAL_CONTENT.md`.)
- Profile settings (username, display name, bio).
- Privacy Notice and Terms of Use.
- Branded 404, error boundaries and route-transition loading states.

## Tech stack

- Next.js (App Router) + React + TypeScript
- Tailwind CSS v4
- Supabase — PostgreSQL, Authentication, Storage
- Vitest (unit tests for pure logic)
- Deployed on Vercel

## Local requirements

- **Node.js 22 or later** (see `.nvmrc`; `nvm use` picks it up).
- npm (bundled with Node).
- A Supabase project (free tier is fine) for local development.

## Installation

```bash
git clone <repo-url>
cd diong
npm install
```

## Environment setup

```bash
cp .env.example .env.local
```

Fill in from your Supabase project (**Project Settings → API**):

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL, e.g. `https://your-ref.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable ("anon") key |

Both are public by design. Diong never uses the service-role key.

## Supabase / database

Apply the migrations in `supabase/migrations/` **in filename order** against the
target project — with the Supabase CLI (`supabase db push`) or by pasting each
file into the SQL Editor once, in order:

1. `202607190001_onboarding_and_profiles.sql`
2. `202607270001_prime_protocol_engine.sql`
3. `202609060001_connections.sql`
4. `202609060002_connection_rpcs.sql`
5. `202609080001_fix_daily_prime_assigned_date.sql`
6. `202609100001_prime_reflections.sql`
7. `202609100002_social_graph.sql`
8. `202609100003_social_content.sql`

Each file is a single transaction and is **not** idempotent — never re-run a
migration that already succeeded. Migrations 2–8 depend on earlier ones. Row
Level Security is enabled on every user-owned table; all writes go through
column-scoped grants or `SECURITY DEFINER` RPCs.

## npm scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server on `http://localhost:3000` |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm test` | Vitest (pure-logic unit tests) |

## Development run

```bash
npm run dev
```

## Tests

```bash
npm test
```

Vitest covers pure application logic only (validation, labels, history/progress
helpers). The SQL nudge and assignment engines are verified by the SQL in
`docs/CONNECTIONS_SETUP.md` and `docs/DAILY_PRIME_HISTORY.md`.

## Production build

```bash
npm run build && npm start
```

Deployment steps, environment configuration and Supabase Auth setup are in
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md). The launch checklist is
[`docs/RELEASE_CHECKLIST.md`](docs/RELEASE_CHECKLIST.md).

## Privacy

Your Daily Prime reflections, your Connections, your private connection notes
and your saved posts are visible only to you. Your profile (display name,
username, optional bio and interest names), your follower / following graph and
the posts you choose to share are visible to other signed-in users according to
each post's visibility; the accounts you have blocked are visible only to you.
See [`/privacy`](app/privacy/page.tsx) and [`/terms`](app/terms/page.tsx).

## Deferred to V1.1

Not yet built: standalone Goals, standalone Habits, a standalone Journal, direct
messages, communities, notifications, post images / media, an AI Coach, Google
integrations, payments, and a native mobile app. These are planned for later
releases and are not advertised as available. The follow / block **social
graph** and the **posts / feed / comments / likes / bookmarks** layer ship now
(see V1 capabilities); the messaging, communities and notification layers that
build on them do not.

## Documentation

- `docs/PRODUCT.md`, `docs/MVP.md`, `docs/ROADMAP.md` — product scope
- `docs/DATA_MODEL.md` — data model
- `docs/ROUTES.md` — routes (shipped and planned)
- `docs/CONNECTIONS_SETUP.md` — Connections schema, RPCs, verification
- `docs/SOCIAL_GRAPH_SETUP.md` — follow / block schema, RPCs, privacy, verification
- `docs/SOCIAL_CONTENT.md` — posts / feed / comments / likes / bookmarks schema, visibility model, RLS, verification
- `docs/DAILY_PRIME_HISTORY.md` — Prime reflections / history / progress
- `docs/DEPLOYMENT.md` — deployment
- `docs/RELEASE_CHECKLIST.md` — launch checklist
- `DIONG_V1_RELEASE_PLAN.md` — V1 completion plan
