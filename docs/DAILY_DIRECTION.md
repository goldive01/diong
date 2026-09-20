# Daily Direction

Pass 9, Step 1 — the first piece of Diong's **Action & Focus** layer. This
document describes Daily Direction on its own; the Pass 9 sequence overall
is Daily Direction → FinishOne → Focus Timer → Priority Compass → Weekly
Reset. Only Daily Direction and its shared foundation are implemented so
far — this document does not describe any of the other four.

## Product purpose

Daily Direction answers one question: **"What matters most for me today?"**
It is designed to take under 60 seconds to set. A user chooses:

- **What matters most today?** (`intention`, optional)
- **Who are you choosing to be today?** (`desired_identity`, optional)
- **What is the one meaningful action?** (`primary_action`, **required**)
- **Why does it matter?** (`why_it_matters`, optional)

Only `primary_action` is required. The brief for this step was explicit
that not every field should be mandatory if that would harm usability, and
that "at minimum, the primary intention/action must provide enough meaning
for the record to be useful" — `primary_action` is that field. A user who
only ever fills in one box still gets a useful, complete record.

A user can set **one Daily Direction per local calendar day** (see
"Date and time behaviour" below for what "calendar day" means here).

## Relationship to Daily Prime

Daily Prime and Daily Direction are deliberately not merged:

| | Daily Prime | Daily Direction |
| --- | --- | --- |
| Content source | Assigned by Diong (a published Prime Protocol) | Chosen entirely by the user |
| Purpose | Attention, reflection, an inspiration-led Action Trigger | The user's own chosen focus and one action |
| Data | `prime_assignments` / `prime_completions` (Pass 2 / Phase G) | `daily_directions` (this pass) |

They can coexist on the same day without conflict — a user might complete
their Daily Prime's Action Trigger *and* separately set a Daily Direction.
Home shows both as separate, clearly labelled cards; neither reads the
other's data, and completing one never affects the other's status.

## Relationship to Goals, Habits and Journal

- **Goals** are longer-term outcomes; **Habits** are repeated behaviours;
  **Journal** is private reflection. Daily Direction is none of these — it
  is a single day's chosen focus and one action.
- A Daily Direction may **optionally** reference one goal and/or one habit
  (`goal_id`, `habit_id`) — e.g. "today's meaningful action" happens to
  serve a specific goal, or relates to a habit the user is building. Both
  links are entirely optional; Daily Direction works completely on its own
  with neither set.
- Daily Direction does **not** create, complete, or otherwise mutate a
  linked goal or habit. The link is informational only, resolved for
  display via the `goalId`/`habitId` select in the form
  (`src/components/direction/direction-form.tsx`), populated from
  `listGoalOptions()` / `listHabitOptions()` (the same option lists the
  Journal's "link to a goal/habit" selectors already use).

## Privacy

Daily Direction is **strictly private**, with no exception in this step:

- Row Level Security scopes every `select`/`insert`/`update` to
  `(select auth.uid()) = user_id`. There is no cross-user, shared, or public
  policy anywhere in `202609150001_daily_direction.sql`.
- The `update` policy additionally requires `direction_date = current_date`
  in both its `using` and `with check` clauses — past directions are
  read-only at the database layer, not just in the UI (see "Date and time
  behaviour" and "Limitations" below).
- `anon` has zero grants. `authenticated` has only the column-scoped
  grants described below.
- Daily Direction is never read by, or surfaced in: the feed, Discover,
  Search, a public profile, communities, direct messages, or a notification
  to another user. No data module outside `src/lib/direction/` reads
  `daily_directions`, and no route outside `app/(protected)/direction/`
  (plus the Home integration, which reads only the current user's own row)
  touches the table.

## Schema

`public.daily_directions` (see the migration for the authoritative,
fully-commented definition):

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `bigint identity` | primary key |
| `user_id` | `uuid` | `references auth.users(id) on delete cascade` |
| `direction_date` | `date` | `not null default current_date`; never client-writable at insert or update — always "today," never backdated |
| `intention` | `text` | optional, 1–280 chars when present |
| `desired_identity` | `text` | optional, 1–160 chars when present |
| `primary_action` | `text` | **required**, 1–240 chars |
| `why_it_matters` | `text` | optional, 1–1000 chars when present |
| `goal_id` | `bigint` | optional, `references public.goals(id) on delete set null` |
| `habit_id` | `bigint` | optional, `references public.habits(id) on delete set null` |
| `status` | `text` | `active` \| `completed` \| `skipped`, default `active` |
| `completed_at` | `timestamptz` | system-managed (see lifecycle below) |
| `created_at` / `updated_at` | `timestamptz` | system-managed |

Constraints: `unique (user_id, direction_date)` (one row per user per day);
per-field length CHECKs; `status` CHECKed against the three allowed values.
Indexes: the unique constraint's own index on `(user_id, direction_date)` is
also what the bounded "recent directions" read relies on — its leading
columns exactly match that query's `where user_id = ? order by
direction_date desc limit ?` shape, so Postgres can satisfy it with a
backward scan of that same ascending index. No separate descending index is
needed (unlike `habit_checkins`, whose unique constraint is keyed on
`(habit_id, checkin_date)` — a different leading column from its own
`(user_id, checkin_date desc)` read index, which is genuinely needed there).

## Architecture decision: no new RPC

Unlike `goal_milestones` / `habit_checkins` (child tables with RPC-only
writes), `daily_directions` is a **top-level, single-owner table with no
child table beneath it** — architecturally the same shape as `public.goals`
and `public.habits`. It follows their precedent exactly: plain owner-CRUD
with column-scoped grants, not an RPC. No new `SECURITY DEFINER` function
was needed for *writes*. Two small trigger functions exist for the same
reason `apply_goal_completion_status()` / `apply_habit_archived_at()` /
`enforce_journal_entry_ownership()` exist — keeping a derived column
consistent, and enforcing same-owner integrity for the optional cross-links
— not for authorization, which RLS already provides:

- `public.apply_direction_completion_status()` — a `BEFORE UPDATE` trigger.
  Entering `'completed'` stamps `completed_at = now()`; leaving `'completed'`
  clears it. A client can never set `completed_at` directly (it is not in
  either grant).
- `public.enforce_daily_direction_ownership()` — a `BEFORE INSERT OR UPDATE`,
  `SECURITY DEFINER` trigger. If `goal_id` or `habit_id` is set, it must
  belong to the same `user_id`, or the write is rejected with a `42501`
  error. `SECURITY DEFINER` here only lets the check run without also being
  subject to `goals`/`habits` RLS from inside the trigger — the check is
  always against `new.user_id`, so this never widens what a caller can see,
  it only lets the existence check complete.

## RPCs

None. All reads and writes go through plain PostgREST table calls
(`supabase.from("daily_directions")...`), scoped by RLS and the
column-scoped grants above, exactly like `public.goals` / `public.habits`.

## Status lifecycle

```
        create (primary_action required)
                    │
                    ▼
                 active ──────────────► completed
                    │   mark complete   │
                    │                   │ reopen
                    │◄──────────────────┘
                    │
                    │  skip today
                    ▼
                 skipped
                    │
                    │  set as active
                    ▼
                 active
```

- A new direction always starts `'active'` (the column default — never
  client-supplied at insert).
- `completed_at` is trigger-derived, never client-writable.
- There is no `delete` grant — a direction is never hard-deleted, matching
  `goals`/`habits`. A user who wants to walk back a day marks it `'skipped'`
  or reopens it to `'active'` instead.
- Completion is intentionally restrained in the UI — a plain "Direction
  completed" line (`src/components/direction/direction-status-actions.tsx`),
  no confetti or celebratory animation, per the brief.

## Date and time behaviour

`direction_date` defaults to `current_date`, which Postgres evaluates in
the database session's timezone — **UTC**, the same as every other
calendar-day column already in Diong: `prime_assignments.assigned_date`,
`habit_checkins.checkin_date`, `journal_entries.entry_date`. The
application layer mirrors this: `todayIsoDate()`
(`src/lib/app/date.ts`) computes `new Date().toISOString().slice(0, 10)` —
the UTC calendar date — and is the single source of "today" for every read
in this feature (`getDirectionForDate()`, the Home card, and the page's
"today" header).

**This is a deliberate, consistent choice, not an oversight.** The
alternative — giving Daily Direction its own, different notion of "today"
(e.g. the browser's local calendar day) — would make "today" mean two
different things in the same app depending on which feature a user is
looking at, which is strictly worse than one clearly documented limitation.

**Known limitation (unchanged from the existing, already-shipped
behaviour):** a user active close to their own local midnight, in a
timezone far from UTC, can see Diong's "today" — for Daily Prime, Habits,
Journal, and now Daily Direction alike — flip a number of hours before or
after their own local midnight. This is tracked as a single item in
`docs/RELEASE_CHECKLIST.md`'s "Known deferred" section ("Per-user time
zone"). Proper per-user timezone support is a larger, cross-feature
architecture change and is explicitly out of scope for this step, per the
brief's own instruction not to broaden scope here.

## Home integration

`app/(protected)/home/page.tsx` fetches the current user's direction for
today (`getDirectionForDate(supabase, userId, today)`, run in parallel with
the page's other reads via `Promise.all`) and renders
`src/components/growth/home-direction-card.tsx`:

- **No direction set** — "Choose your direction for today" + a CTA to
  `/direction`.
- **Active** — shows the intention (if set) and the primary action, with a
  CTA to open `/direction`.
- **Completed** — a quiet, restrained completed state showing the primary
  action, with a link (not a button) to view it.

Daily Prime keeps its own, separate "Today" card — the two are visually
distinct sections on Home, never merged into one card.

## Shared Action & Focus foundation (Pass 9 prep)

Per the brief, this step only extracts shared code that Step 1 itself
already needed — nothing speculative for FinishOne / Focus Timer / Priority
Compass / Weekly Reset, which are not designed yet:

- **`src/lib/app/date.ts`** — `todayIsoDate()`, moved out of
  `src/lib/habits/habit-validation.ts` (the wrong home for a cross-feature
  date helper) into `src/lib/app/`, where `nav-active.ts` already lives as
  Diong's convention for small, app-wide (not feature-owned) utilities.
  `habit-validation.ts` now re-exports it, so every existing import
  (`app/(protected)/home/page.tsx` previously, `habits/page.tsx`,
  `habits/[id]/page.tsx`, `habits/[id]/edit/page.tsx`,
  `journal/new/page.tsx`) keeps working unchanged. Both Habits and Daily
  Direction call the same function for the same UTC "today," which is the
  genuine, non-speculative shared need this step already has.

`status` vocabulary (`active` / `completed` / `skipped`) is **not**
generalised into a shared "action status" concept in this step — it lives
in `src/lib/direction/direction-vocab.ts`, scoped to Daily Direction only,
mirroring how `goal-vocab.ts` / `habit-vocab.ts` each own their own status
set. FinishOne and the other Pass 9 features have not been designed yet;
generalising this now would be exactly the speculative abstraction the
brief warns against. If a later Pass 9 step turns out to need the same
three-state shape, that is the point to extract it — not before.

## Limitations

- One direction per calendar day — there is no way to log a direction for
  a past day retroactively (`direction_date` is never client-writable).
- No individual "direction detail" page/route exists yet — only the
  current day's direction (on `/direction`) and a bounded, read-only recent
  list (`RECENT_DIRECTION_LIMIT = 14` rows,
  `src/lib/direction/direction-data.ts`). There is no pagination, search,
  or analytics view over direction history yet.
- No streak, completion-rate, or other derived statistic is computed for
  Daily Direction in this step (deliberately — the brief asked for a short
  bounded history, not an analytics dashboard).
- Editing today's direction after it is set is supported (the same form,
  pre-filled); there is no edit access to a past day's direction.
- See "Date and time behaviour" above for the UTC-calendar-day limitation
  shared with every other daily feature in Diong.

## Manual migration / application steps

The migration file is **`supabase/migrations/202609150001_daily_direction.sql`**.
It has **not** been applied to any Supabase project as part of this step —
per Pass 9 Step 1's explicit instruction, only the migration *file* was
created; it is pending manual review before being applied.

To apply, once reviewed:

1. Confirm no earlier migration in `supabase/migrations/` is unapplied —
   this file depends on `202609130001_goals_habits_journal.sql` (for
   `public.goals` / `public.habits`) and everything before it.
2. Apply via the Supabase CLI (`supabase db push`) or by pasting the file
   into the SQL Editor once, exactly as written — it is a single
   `begin … commit` transaction and is **not** idempotent; never re-run it
   after it has succeeded.
3. Optional verification queries after applying:

   ```sql
   -- Table + RLS present
   select relrowsecurity from pg_class where oid = 'public.daily_directions'::regclass;

   -- Policies present (expect 3: select / insert / update)
   select polname from pg_policy where polrelid = 'public.daily_directions'::regclass;

   -- Grants: anon has none, authenticated has select + column-scoped insert/update
   select grantee, privilege_type from information_schema.role_table_grants
   where table_name = 'daily_directions';

   -- Column-scoped grants: confirms exactly which columns anon/authenticated
   -- can insert/update. Expect: anon has no rows at all; authenticated has
   -- select (no column_name — table-level); insert only for user_id,
   -- intention, desired_identity, primary_action, why_it_matters, goal_id,
   -- habit_id; update only for intention, desired_identity, primary_action,
   -- why_it_matters, goal_id, habit_id, status; no delete rows for anyone;
   -- direction_date, id, completed_at, created_at and updated_at must never
   -- appear for insert or update.
   select grantee, privilege_type, column_name
   from information_schema.column_privileges
   where table_name = 'daily_directions'
   order by grantee, privilege_type, column_name;

   -- Triggers present (expect 3: updated_at, completion status, ownership)
   select tgname from pg_trigger
   where tgrelid = 'public.daily_directions'::regclass and not tgisinternal;
   ```
