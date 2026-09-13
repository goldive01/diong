# Diong Goals, Habits & Private Journal — Pass 6

Pass 6 adds Diong's private personal-development layer on top of Daily Prime
and Connections: **goals with milestones and explicit progress, habits with
deterministic streaks, and a private journal** that can optionally link to a
goal, a habit or a Daily Prime assignment.

Pass 6 does **not** redesign Daily Prime, Connections, the social graph,
Direct Messages or Communities. It does not add AI, paid features, or expose
Goals/Habits/Journal anywhere outside the signed-in owner's own view. It does
not modify any already-applied migration file.

## What a user can do after Pass 6

- Define a goal (`/goals/new`) with an optional description, category and
  target date.
- Break a goal into milestones and toggle them complete (`/goals/[id]`).
- Update a goal's progress explicitly (0–100%), optionally derived from
  completed milestones with one deliberate click — never automatically.
- Pause / resume / mark complete / archive a goal; reopen a completed goal.
- Start a habit (`/habits/new`) with a daily or weekly frequency and a target
  count per period.
- Check in a habit for today (or undo it), see a deterministic current and
  longest streak, and archive / reactivate a habit.
- Write a private journal entry (`/journal/new`) with an optional title,
  mood, and links to a goal, a habit and/or a Daily Prime assignment; search
  and filter entries by date, mood or text; edit or permanently delete an
  entry.
- See a calm "Your focus" summary on `/home` and an optional "Reflect
  further in Journal" prompt after completing today's Daily Prime.

Everything in this document is **strictly private to its owner**. None of it
is ever surfaced by the feed, Discover, global Search, a public profile,
communities, messages, or a notification sent to another user.

## Architecture decisions

- **Goals, habits and journal_entries are plain owner-CRUD tables** with
  column-scoped, revoke-first grants — the exact model `public.connections`
  already uses (see `docs/CONNECTIONS_SETUP.md`). This is the fastest correct
  fit for single-owner records with no cross-user concern.
- **`goal_milestones` and `habit_checkins` are RPC-only**, mirroring
  `connection_interactions`: `SELECT` is granted to the owner, but every
  write goes through a `SECURITY DEFINER` function
  (`add_goal_milestone` / `toggle_goal_milestone` and
  `check_in_habit` / `undo_habit_checkin`). This is what keeps milestone
  ownership, position assignment and check-in idempotency
  database-authoritative rather than trusted to the client.
- **Two small `BEFORE UPDATE` triggers** (`apply_goal_completion_status()`,
  `apply_habit_archived_at()`) keep `completed_at` / `archived_at`
  system-managed and excluded from every grant — the same
  "derived column the client can never forge" pattern
  `connections.last_meaningful_contact_at` uses, just via a trigger instead
  of an RPC (there is no second table/side effect to coordinate here, so a
  trigger is simpler and sufficient).
- **A CHECK constraint, not application code, is what actually stops a
  completed goal from showing a partial percentage**:
  `goals_completed_progress_full check (status <> 'completed' or
  progress_percent = 100)`. The completion trigger fills in `progress_percent
  = 100` on the same statement that sets `status = 'completed'`, so a normal
  status change never even touches the boundary; the constraint exists as
  the actual enforcement layer, not merely a comment.
- **Journal's three optional cross-links use plain single-column foreign
  keys with `ON DELETE SET NULL`, not a composite foreign key.** A composite
  `(goal_id, user_id)`-style FK (the pattern `goal_milestones` and
  `habit_checkins` use) would require Postgres's per-column
  `ON DELETE SET NULL (goal_id)` syntax to avoid also nulling `user_id` —
  correct on modern Postgres, but an unnecessary sharp edge for an optional,
  independently-owned link. Instead, `enforce_journal_entry_ownership()` (a
  `BEFORE INSERT OR UPDATE` trigger) explicitly checks that any non-null
  `goal_id` / `habit_id` / `prime_assignment_id` belongs to the same
  `user_id`, and the plain FK on each column handles cleanup when the linked
  goal/habit/Prime assignment is later removed.
- **Journal entries allow a hard delete; goals and habits do not.** A goal or
  habit's history (milestones, check-ins, streak) is evidence a delete would
  silently destroy, so both use `status = 'archived'` / `is_active = false`
  instead — there is no `DELETE` grant on either table. A journal entry has
  no downstream row referencing it (nothing computes a streak or count from
  journal history), so a confirmed, owner-only hard delete is safe and
  simpler than adding an `archived_at` column nobody would query.
- **Streak math lives entirely in TypeScript, not SQL** —
  `src/lib/habits/habit-streak.ts` — mirroring
  `src/lib/prime-progress.ts`'s existing style (pure functions, `today`
  injected, plain calendar-date string diffing). The RPCs only read/write
  check-in rows; nothing is pre-aggregated or cached in the database.

## Migration to run

Apply in order against the target Supabase project, after every earlier
migration:

1. `supabase/migrations/202609130001_goals_habits_journal.sql`

It depends on `public.profiles` / `auth.users` (202607190001) and
`public.prime_assignments` (202607270001) for the journal's optional Daily
Prime link. It is a single `begin … commit` transaction and is **not**
idempotent — `create table` / `create function` (not `create or replace`)
fail cleanly if the objects already exist. Never re-run a migration that
already succeeded. Nothing in this file alters an existing table, function,
grant, policy or trigger from Pass 1–5.

```bash
supabase db push
```

Or paste the whole file once into the SQL Editor, confirm the project, run
it, and record the filename + date in the deployment log.

## Schema

### `public.goals`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `bigint` identity | Primary key. |
| `user_id` | `uuid` | `references auth.users(id) on delete cascade`. Always the authenticated session — never a client-supplied column at update time. |
| `title` | `text` | 1–120 characters after trimming. |
| `description` | `text` | Default `''`, ≤ 3000 characters. |
| `category` | `text` | Optional free text, 1–60 characters when present. No controlled vocabulary — a goal's category is the owner's own word for it. |
| `status` | `text` | One of `active` / `paused` / `completed` / `archived`; default `active`. |
| `target_date` | `date` | Optional. |
| `progress_percent` | `integer` | 0–100; default `0`. Explicit only — never auto-derived except by the one-time "set from milestones" helper the owner triggers deliberately. |
| `created_at` / `updated_at` | `timestamptz` | `updated_at` maintained by `goals_set_updated_at`. |
| `completed_at` | `timestamptz` | System-managed by `apply_goal_completion_status()` — never client-writable. |

Constraint `goals_completed_progress_full` ties `status = 'completed'` to
`progress_percent = 100` (see Architecture decisions above). Target for the
composite foreign key from `goal_milestones`: `unique (id, user_id)`.

### `public.goal_milestones`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `bigint` identity | Primary key. |
| `goal_id` | `bigint` | Part of the composite FK `(goal_id, user_id) → goals(id, user_id)`, `on delete cascade`. |
| `user_id` | `uuid` | `references auth.users(id) on delete cascade`. Always the goal's own owner — enforced by the composite FK. |
| `title` | `text` | 1–200 characters. |
| `position` | `integer` | Server-computed by `add_goal_milestone()` (`max(position) + 1`) — never client-supplied. |
| `is_completed` | `boolean` | Default `false`. Changed only by `toggle_goal_milestone()`. |
| `completed_at` | `timestamptz` | Set/cleared by `toggle_goal_milestone()` in lockstep with `is_completed`. |
| `created_at` | `timestamptz` | Default `now()`. |

**Milestone ownership always matches goal ownership** — structurally, via the
composite foreign key, not merely by convention.

### `public.habits`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `bigint` identity | Primary key. |
| `user_id` | `uuid` | `references auth.users(id) on delete cascade`. |
| `name` | `text` | 1–120 characters. |
| `description` | `text` | Default `''`, ≤ 1000 characters. |
| `frequency` | `text` | One of `daily` / `weekly` — V1 deliberately avoids complex custom schedules. |
| `target_per_period` | `integer` | 1–100; default `1`. For `daily`, how much a single day's check-in `value` must reach to count as met; for `weekly`, the sum of the week's check-in values. |
| `is_active` | `boolean` | Default `true`. |
| `created_at` / `updated_at` | `timestamptz` | `updated_at` maintained by `habits_set_updated_at`. |
| `archived_at` | `timestamptz` | System-managed by `apply_habit_archived_at()` — never client-writable. |

Target for the composite foreign key from `habit_checkins`:
`unique (id, user_id)`.

### `public.habit_checkins`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `bigint` identity | Primary key. |
| `habit_id` | `bigint` | Part of the composite FK `(habit_id, user_id) → habits(id, user_id)`, `on delete cascade`. |
| `user_id` | `uuid` | `references auth.users(id) on delete cascade`. |
| `checkin_date` | `date` | The calendar date the check-in is for — not necessarily "today" (a back-dated check-in is allowed, a future one is rejected). |
| `value` | `integer` | 1–1000; default `1`. How much of the habit was done that day (e.g. "3 glasses of water"). A plain "done today" tap posts `1`. |
| `note` | `text` | Optional, ≤ 500 characters. |
| `created_at` | `timestamptz` | Default `now()`. |

Unique `(habit_id, checkin_date)` — one row per habit per day; `check_in_habit()` upserts onto it, so calling it again the same day corrects
`value`/`note` rather than erroring. **Ownership always matches** —
structurally, via the composite foreign key.

### `public.journal_entries`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `bigint` identity | Primary key. |
| `user_id` | `uuid` | `references auth.users(id) on delete cascade`. |
| `title` | `text` | Optional, 1–200 characters when present. |
| `body` | `text` | 1–10000 characters. |
| `mood` | `text` | Optional. One of `calm` / `focused` / `energised` / `neutral` / `stressed` / `low` / `grateful` / `reflective` — self-reported vocabulary for reflection, **never a diagnosis**. |
| `entry_date` | `date` | Defaults to `current_date`. |
| `goal_id` | `bigint` | Optional. `references public.goals(id) on delete set null`. |
| `habit_id` | `bigint` | Optional. `references public.habits(id) on delete set null`. |
| `prime_assignment_id` | `bigint` | Optional. `references public.prime_assignments(id) on delete set null`. |
| `created_at` / `updated_at` | `timestamptz` | `updated_at` maintained by `journal_entries_set_updated_at`. |

**Foreign linked resources must belong to the same user** — enforced by the
`enforce_journal_entry_ownership()` `BEFORE INSERT OR UPDATE` trigger, which
raises a safe `42501` error if `goal_id` / `habit_id` / `prime_assignment_id`
is set but does not belong to `new.user_id`. This runs regardless of what
the application layer already filtered client-side.

## Goal lifecycle

`active → paused ⇄ active`, `active/paused → completed`,
`active/paused → archived`, and `completed → active` (reopen). There is no
`archived → *` transition in Pass 6 — an archived goal is a terminal, quiet
state you can still view but not act on further from this pass.

- **Completion**: setting `status = 'completed'` (via a plain, column-scoped
  `UPDATE`) is caught by `apply_goal_completion_status()`, which stamps
  `completed_at = now()` and forces `progress_percent = 100` **in the same
  statement** — the caller never needs to also send `progress_percent`.
- **Reopen**: setting `status` away from `'completed'` clears `completed_at`.
  `progress_percent` is deliberately left at its current value (100, unless
  the owner changes it again afterward) — nothing in the brief asked for it
  to reset on reopen.
- **Progress while completed is locked**: the `goals_completed_progress_full`
  CHECK constraint rejects any `progress_percent` other than 100 while
  `status` stays `'completed'`. The app maps the resulting `23514` to
  "Reopen this goal before changing its progress." — the owner must reopen
  first.

## Milestone design

Milestones are minimal by design: a title and a position, nothing else.
`add_goal_milestone(p_goal_id, p_title)` appends at
`max(position) + 1` — the position is never client-supplied, so there is no
way to force a collision or an out-of-order insert.
`toggle_goal_milestone(p_milestone_id)` flips `is_completed` and sets/clears
`completed_at` to match, resolving ownership through the milestone's own
`goal_id`/`user_id` pair (which the composite FK guarantees match the goal's
owner) — so a milestone can never be toggled by anyone but the goal's owner.

**Milestones inform progress; they never silently override it.** The
"Set progress from completed milestones" button
(`setGoalProgressFromMilestonesAction`) reads the goal's milestones, computes
`round(100 * completed / total)` in TypeScript
(`progressFromMilestones()`, pure and unit-tested), and writes it through the
same `progress_percent` update path as a manual edit — a single, deliberate
action the owner takes, never a trigger or a side effect of toggling a
milestone.

## Habit frequency and check-ins

V1 supports exactly two frequencies — `daily` and `weekly` — deliberately
avoiding custom schedules (every-other-day, specific weekdays, etc.).
`target_per_period` gives a check-in's `value` field meaning beyond a bare
"done": a habit like "drink water" might have `target_per_period = 8` and a
check-in `value` of however many glasses were logged that day; a habit like
"read" might just use the default `value = 1` and `target_per_period = 1`
(a plain done/not-done day).

`check_in_habit()` is idempotent per `(habit_id, checkin_date)` — calling it
again for the same date updates `value`/`note` rather than erroring, so
correcting a same-day check-in never requires an explicit undo first.
`undo_habit_checkin()` is a no-op (not an error) when nothing exists for that
date, matching `leave_community()`'s "harmless no-op" precedent. Both
require the caller to own the habit; `check_in_habit()` additionally
requires the habit to still be active (an archived habit cannot silently
accumulate new check-ins — the owner must reactivate it first).

## Streak algorithm

Implemented once, in pure TypeScript, in
`src/lib/habits/habit-streak.ts` (mirroring
`src/lib/prime-progress.ts`'s style) — **not** in SQL, and **not**
pre-aggregated anywhere. `calculateHabitStreak(checkins, frequency,
targetPerPeriod, today)` is deterministic and never fabricates a missing
day:

- **Daily**: groups check-ins by calendar date; a date is "met" when its
  `value >= targetPerPeriod`. The longest streak is the longest run of
  consecutive calendar dates that are each met — a missing date (no row at
  all) breaks the run exactly like an under-target one. The current streak
  only counts if the most recent met date is **today or yesterday** (a
  "live" window matching `calculatePrimeProgress`'s own current-streak rule);
  otherwise it is `0`, not a frozen historical number.
- **Weekly**: groups check-ins by the Monday of their calendar week
  (`mondayOf()`); a week is "met" when the **sum** of that week's check-in
  values reaches `targetPerPeriod`. The same longest/current logic applies
  with a 7-day step instead of a 1-day step — the current streak counts only
  if the most recently met week is the current week or the immediately
  preceding one.
- **Total check-ins** is simply the count of raw check-in rows the caller
  passed in (bounded — see Performance below), regardless of whether each one
  met its target.

No day or week is ever invented to "fill a gap" — the algorithm only ever
reasons about periods that actually have at least one check-in row.

### Known timezone caveat

`checkin_date` is a plain calendar date and `today` is injected as a
"YYYY-MM-DD" string computed server-side (UTC). **Diong does not yet have
per-user timezone support** — this is the same limitation
`docs/CONNECTIONS_SETUP.md` already documents for the nudge engine, and Pass
6 does not invent a partial timezone system to work around it here either. A
user several hours from UTC may see "today" (and therefore a streak's
live/not-live boundary) roll over up to a day before or after their own
local midnight. Adding real per-user timezone support would fix this for
Connections, Daily Prime and Habits together; it remains out of scope for
this pass, by instruction.

## Journal linking

A journal entry may optionally reference **one** goal, **one** habit and
**one** Daily Prime assignment — all three independently optional, all three
same-owner-only. Linking happens two ways:

- **From the journal form itself** (`/journal/new`, `/journal/[id]/edit`):
  three dropdowns populated from `listGoalOptions()` / `listHabitOptions()`
  (bounded to the owner's own goals/active habits) and
  `listPrimeAssignmentOptions()` (the owner's 20 most recent Daily Prime
  assignments, labelled by protocol title + date).
- **From Daily Prime**, after completing today's assignment: a
  "Reflect further in Journal" link pre-fills `primeAssignmentId` via a query
  parameter (`/journal/new?primeAssignmentId=<id>`); goal-linking itself
  still happens inside the same form (see Daily Prime integration below).

`/goals/[id]` and `/habits/[id]` each also show any journal entries linked
back to them (a small, bounded list), so the connection is visible from
either direction.

## Search / filter

`/journal` filters by an exact `entry_date`, a `mood`, and/or a text query
matched against `title`/`body` (case-insensitive substring, via a
server-scoped `.or()` filter with wildcard/operator characters escaped so a
search string can never break the intended two-column filter shape). All
three are optional and combine with AND. **There is no public search
integration** — `/journal`'s search never touches, and is never touched by,
the global `search_posts()` / `search_people()` / `search_communities()`
paths from earlier passes.

## RLS / security

RLS is enabled on all five new tables with a revoke-first model.

| Table | `authenticated` grant | Notes |
| --- | --- | --- |
| `goals` | `SELECT`; column-scoped `INSERT` (`user_id, title, description, category, target_date`); column-scoped `UPDATE` (`title, description, category, target_date, status, progress_percent`) | No `DELETE` — archived, never removed. `id`, `created_at`, `updated_at`, `completed_at` are never client-writable. |
| `goal_milestones` | `SELECT` only | Writes are RPC-only (`add_goal_milestone` / `toggle_goal_milestone`). |
| `habits` | `SELECT`; column-scoped `INSERT` (`user_id, name, description, frequency, target_per_period`); column-scoped `UPDATE` (`name, description, frequency, target_per_period, is_active`) | No `DELETE` — archived, never removed. `archived_at` is never client-writable. |
| `habit_checkins` | `SELECT` only | Writes are RPC-only (`check_in_habit` / `undo_habit_checkin`). |
| `journal_entries` | `SELECT`, column-scoped `INSERT`/`UPDATE` (`title, body, mood, entry_date, goal_id, habit_id, prime_assignment_id`), `DELETE` | The one table in this pass with a `DELETE` grant — see Architecture decisions. |

`anon` has no access to any of the five tables. Every `SELECT`/`INSERT`/
`UPDATE`/`DELETE` policy is `(select auth.uid()) = user_id` — owner-only,
with no shared or public policy anywhere. `browser cannot choose another
user_id`: `user_id` is never in any `UPDATE` grant, and every `INSERT` policy
has `with check ((select auth.uid()) = user_id)`, so the value the client
sends must already equal the caller's own id or the insert is rejected by
RLS regardless.

Every `SECURITY DEFINER` function (`add_goal_milestone`,
`toggle_goal_milestone`, `check_in_habit`, `undo_habit_checkin`) is
`set search_path = ''`, schema-qualifies every reference, requires
`auth.uid()` to be non-null, is `revoke`d from `public`/`anon` and granted
`execute` to `authenticated` only. Every error raised uses a fixed,
non-leaking message ("Authentication is required.", "This goal is not
available.", "Choose a title between 1 and 200 characters.", etc.) — no raw
Postgres/constraint text ever reaches the client. The TypeScript mutation
wrappers (`goal-mutations.ts`, `habit-mutations.ts`) collapse every SQLSTATE
(`42501` / `22023` / `23514` / `23503`) to `not_available` / `invalid` /
`unknown` before it reaches a server action; every direct-table server
action additionally maps `23514` (a CHECK violation) to a calm, specific
message rather than surfacing it raw.

**Nothing is trusted from `FormData`**: `user_id`, `created_at`, `updated_at`,
`completed_at` and `archived_at` are never read from a form anywhere in this
pass — `user_id` always comes from `requireCompletedProfile()`'s
authenticated session, and the four timestamp columns are either
column-default-only or trigger-managed.

Nothing in this migration alters an existing table, function, grant, policy
or trigger — Pass 1–5 RLS is untouched.

## Performance / pagination

Indexes match the query shapes the application layer actually uses:

```sql
goals(user_id, status, created_at desc)
goal_milestones(goal_id, position)
habits(user_id, is_active)
habit_checkins(habit_id, checkin_date desc)
habit_checkins(user_id, checkin_date desc)
journal_entries(user_id, entry_date desc)
```

- **Journal** is offset-paginated (`journal-pagination.ts`, a fresh, private
  copy — deliberately not reusing `src/lib/social/pagination.ts` or
  `src/lib/communities/community-pagination.ts`, following those files' own
  stated precedent), page size 20.
- **Habit check-in history** is always bounded: streak calculation and the
  detail page's history both read at most a 180-day window
  (`HISTORY_WINDOW_DAYS` in `habits-data.ts`) — comfortably enough for a long
  daily streak or ~25 weekly periods — and the visible history list further
  caps at `RECENT_CHECKIN_LIMIT` (30) rows, the same "bounded, never
  unlimited" precedent `interaction-history.tsx` set for Connections.
- **N+1 avoidance**: `listHabits()` fetches every habit's check-ins in one
  batched query (`habit_id in (...)`), not one query per habit; journal's
  list and detail reads batch-resolve linked goal/habit/Prime titles in at
  most three extra queries total, never one per row.
- **Home integration** uses a dedicated lightweight summary
  (`getHabitTodaySummary()`) — two `count`-only queries, no streak
  calculation, no per-habit check-in read — since `/home` only needs
  "N of M checked in today", not each habit's full detail.

## Routes

| Route | Purpose |
| --- | --- |
| `/goals` | Active / Completed / Paused+Archived sections. |
| `/goals/new` | Create a goal. |
| `/goals/[id]` | Detail: progress, milestones, status actions, linked journal entries. |
| `/goals/[id]/edit` | Edit title/description/category/target date. |
| `/habits` | Today's habits (with quick check-in) and the full list. |
| `/habits/new` | Create a habit. |
| `/habits/[id]` | Detail: streaks, check-in form, history, archive/reactivate. |
| `/habits/[id]/edit` | Edit name/description/frequency/target. |
| `/journal` | Paginated, filterable list (date / mood / text). |
| `/journal/new` | Write an entry, with optional goal/habit/Prime links. |
| `/journal/[id]` | Full entry, edit / delete. |
| `/journal/[id]/edit` | Edit an entry. |

Every `[id]` route uses `notFound()` (branded 404) for an invalid id, a
missing resource, or another user's resource — `getGoal()` / `getHabit()` /
`getJournalEntry()` all return `null` for every one of those cases,
identically to `getConnection()`'s existing convention.

## Home integration

`/home` gains one additional, restrained section — **Your focus** — showing
up to 3 active goals (by title, linking to each) and a plain habit
completion count ("N of M checked in today"), plus three links (View goals /
View habits / Write journal entry). No fake statistics, no streak numbers on
`/home`, no journal body ever shown there. The rest of `/home` (Daily Prime
card, interests, the Connections nudge) is unchanged.

## Daily Prime integration

After completing today's Prime, two small optional links appear below the
existing reflection form: "Reflect further in Journal" and a lighter-weight
"Connect this reflection to a goal" note — both point at
`/journal/new?primeAssignmentId=<id>` (goal selection happens inside the
journal form's own dropdown). Writing a journal entry is never mandatory,
and nothing about Prime assignment/completion logic (`get_or_assign_daily_prime`, `complete_daily_prime`) is touched.

## Navigation

A native `<details>`/`<summary>` "Growth" disclosure was added to the header
between Daily Prime and Feed, holding Goals / Habits / Journal — no client
JavaScript required (works with CSS/HTML alone, keyboard-operable by
default), keeping the desktop nav from growing three more top-level links.
At 375px the header still wraps without horizontal scroll, matching the
rest of the nav's existing behaviour.

## Empty states

- **Goals**: "No goals yet. Create a direction you want to work toward."
- **Habits**: "No habits yet. Start with one repeatable action."
- **Journal**: "No journal entries yet. Write down what you are noticing."
  (a separate "No entries match this filter." appears when a filter yields
  nothing, so a filtered empty list is never confused with a truly empty
  journal.)

## Accessibility

Progress is rendered with a real `role="progressbar"` (`aria-valuenow` /
`-valuemin` / `-valuemax`) and the percentage is always shown as text
alongside it — never colour-only. Every form follows the repo's established
pattern: controlled values, client- and server-side validation, values
preserved on failure, stale errors cleared only once a field is edited past
them, explicit `type="submit"`/`type="button"`, `aria-invalid` +
`aria-describedby` error wiring, visible focus via Tailwind's default focus
ring, and `min-h-10`/`min-h-11`/`min-h-12` touch targets throughout (44px-ish
or larger). No new render-loop bug was introduced: the two places that clear
a form on success (`AddMilestoneForm`, mirroring the existing
`CommunityPostComposer` pattern) guard the `setState`-in-`useEffect` with the
same documented `eslint-disable react-hooks/set-state-in-effect` exception,
firing only on a genuine new success result — never on every render, and
never repeatedly.

## Tests

`src/lib/goals/goal-vocab.test.ts` — the four goal statuses and their type
guard.

`src/lib/goals/goal-validation.test.ts` — normalization, title/description/
category/target-date validation, progress percent parsing + range
validation, milestone title validation, `progressFromMilestones()`, and
goal-id parsing.

`src/lib/habits/habit-vocab.test.ts` — the two frequencies and their type
guard.

`src/lib/habits/habit-validation.test.ts` — normalization, name/description/
frequency/target validation, check-in value/note normalization + validation,
habit-id and check-in-date parsing.

`src/lib/habits/habit-streak.test.ts` — the calendar-date helpers
(`differenceInCalendarDays`, `mondayOf`), and `calculateHabitStreak()` for
both frequencies: an empty history, a live consecutive run, a run that has
gone stale (yesterday vs. two days ago), a gap that breaks the streak
without fabricating the missing day, an under-target day counted as unmet,
an exact-target day counted as met, the longest historical run differing
from the live current one, weekly sum-across-the-week counting, and a
non-consecutive week breaking a weekly streak.

`src/lib/journal/journal-vocab.test.ts` — the eight moods and their type
guard.

`src/lib/journal/journal-validation.test.ts` — normalization (including the
blank-`entryDate`-defaults-to-today rule), title/body/mood/date validation,
linked-id parsing (goal/habit/Prime), and `journalColumns()`'s
blank-to-`null` mapping.

`src/lib/journal/journal-pagination.test.ts` — page-number parsing and
offset-window computation (mirrors the Communities/Connections pagination
test shape).

No Supabase RLS behaviour is faked in TypeScript tests — cross-user
isolation, ownership integrity and the completion/archival triggers are
verified against the live database via the SQL verification queries and
manual checks below, not unit-tested.

## `npm test` result

All 35 test files / 374 tests pass, including the 8 new Pass 6 test files
(72 new test cases).

## `npm run lint` result

Clean — zero errors, zero warnings.

## `npm run build` result

Succeeds via Turbopack (`next build`'s default for this project — no
Webpack override was introduced). All 12 new routes
(`/goals`, `/goals/new`, `/goals/[id]`, `/goals/[id]/edit`, `/habits`,
`/habits/new`, `/habits/[id]`, `/habits/[id]/edit`, `/journal`,
`/journal/new`, `/journal/[id]`, `/journal/[id]/edit`) build as dynamic
(`ƒ`) routes, consistent with every other protected, per-user route. No
local Turbopack memory failure occurred, so the `next build --webpack`
fallback was not needed.

## SQL verification

Run in the Supabase SQL Editor after applying the migration.

### Tables exist

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'goals', 'goal_milestones', 'habits', 'habit_checkins', 'journal_entries'
  )
order by table_name;
```

Expect five rows.

### Foreign keys and their delete actions

```sql
select conrelid::regclass as table_name, conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid in (
  'public.goals'::regclass, 'public.goal_milestones'::regclass,
  'public.habits'::regclass, 'public.habit_checkins'::regclass,
  'public.journal_entries'::regclass
)
and contype in ('f', 'u')
order by table_name, conname;
```

Expect: `goals_id_user_id_key` / `habits_id_user_id_key` as `UNIQUE`;
`goal_milestones_goal_fk` as
`FOREIGN KEY (goal_id, user_id) REFERENCES goals(id, user_id) ON DELETE CASCADE`;
`habit_checkins_habit_fk` as the equivalent for habits; and
`journal_entries`'s three single-column FKs on `goal_id` / `habit_id` /
`prime_assignment_id` each as `ON DELETE SET NULL` (no composite).

### Constraints (status, progress lock, moods, frequencies)

```sql
select conrelid::regclass as table_name, conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid in (
  'public.goals'::regclass, 'public.habits'::regclass,
  'public.habit_checkins'::regclass, 'public.journal_entries'::regclass
)
and contype = 'c'
order by table_name, conname;
```

Confirm `goals_completed_progress_full`, `goals_status_allowed`,
`habits_frequency_allowed`, `journal_entries_mood_allowed` are present with
the expected value lists.

### Unique constraint on habit_checkins

```sql
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.habit_checkins'::regclass and contype = 'u';
```

Expect `habit_checkins_unique_day` as `UNIQUE (habit_id, checkin_date)`.

### Indexes

```sql
select tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in (
    'goals', 'goal_milestones', 'habits', 'habit_checkins', 'journal_entries'
  )
order by tablename, indexname;
```

Confirm the six indexes listed under Performance above are present (plus
each table's primary/unique-constraint indexes).

### RLS is enabled

```sql
select relname, relrowsecurity
from pg_class
where oid in (
  'public.goals'::regclass, 'public.goal_milestones'::regclass,
  'public.habits'::regclass, 'public.habit_checkins'::regclass,
  'public.journal_entries'::regclass
)
order by relname;
```

All five `relrowsecurity` values must be `true`.

### Policies are owner-only

```sql
select tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'goals', 'goal_milestones', 'habits', 'habit_checkins', 'journal_entries'
  )
order by tablename, cmd, policyname;
```

Expect: 3 policies on `goals` (select/insert/update), 1 on
`goal_milestones` (select), 3 on `habits` (select/insert/update), 1 on
`habit_checkins` (select), 4 on `journal_entries`
(select/insert/update/delete). Every `qual`/`with_check` must read
`(select auth.uid()) = user_id`; no policy may reference another user's
rows.

### Grants match the revoke-first model

```sql
select table_name, privilege_type, grantee
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'goals', 'goal_milestones', 'habits', 'habit_checkins', 'journal_entries'
  )
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;
```

Expect no rows for `anon`. For `authenticated`: `goals` and `habits` have
`SELECT`, `INSERT`, `UPDATE` (no `DELETE`); `goal_milestones` and
`habit_checkins` have `SELECT` only; `journal_entries` has `SELECT`,
`INSERT`, `UPDATE`, `DELETE`.

### Column-scoped INSERT/UPDATE grants

```sql
select table_name, column_name, privilege_type
from information_schema.column_privileges
where table_schema = 'public'
  and table_name in ('goals', 'habits', 'journal_entries')
  and grantee = 'authenticated'
  and privilege_type in ('INSERT', 'UPDATE')
order by table_name, privilege_type, column_name;
```

Confirm `id`, `created_at`, `updated_at` never appear for any table;
`completed_at` never appears for `goals`; `archived_at` never appears for
`habits`; `status`/`progress_percent` appear for `goals` `UPDATE` but not
`INSERT`; `user_id` appears for `INSERT` on all three but never for
`UPDATE`.

### RPCs exist with the expected security settings

```sql
select
  p.proname,
  p.prosecdef as security_definer,
  p.proconfig as config,
  pg_get_function_identity_arguments(p.oid) as args
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'add_goal_milestone', 'toggle_goal_milestone',
    'check_in_habit', 'undo_habit_checkin'
  )
order by p.proname;
```

Expect `security_definer = true` and `config = {search_path=""}` for all
four.

### Execution privileges (authenticated only)

```sql
select
  p.proname,
  coalesce(has_function_privilege('authenticated', p.oid, 'execute'), false) as authenticated_exec,
  coalesce(has_function_privilege('anon', p.oid, 'execute'), false) as anon_exec,
  coalesce(has_function_privilege('public', p.oid, 'execute'), false) as public_exec
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'add_goal_milestone', 'toggle_goal_milestone',
    'check_in_habit', 'undo_habit_checkin'
  );
```

Expect `authenticated_exec = true`, `anon_exec = false`, `public_exec =
false` for all four.

### Cross-user isolation (two-user check)

Using Supabase clients authenticated separately as users A and B, with a
goal, a habit and a journal entry created by A:

1. B cannot `select`, `update` (or, for the journal, `delete`) any of A's
   rows in any of the five tables — RLS.
2. B calling `toggle_goal_milestone(<A's milestone id>)` raises "This
   milestone is not available." (`42501`); no row changes.
3. B calling `check_in_habit(<A's habit id>)` raises "This habit is not
   available." (`42501`); no row is written.
4. A cannot set `user_id` on `update` for any of the five tables (not in any
   column-scoped grant, and RLS `with_check` would reject it regardless).
5. A cannot set `completed_at` on `goals` or `archived_at` on `habits` via
   `insert`/`update` — neither column is in any grant.

### Goal-milestone ownership

```sql
-- As user A, attempt to attach a milestone to a goal you do not own (replace
-- <B_goal_id> with a goal id that belongs to user B):
select public.add_goal_milestone(<B_goal_id>, 'Should fail');
```

Expect `This goal is not available.` (`42501`); no row is written.

### Habit-checkin ownership

```sql
-- As user A, attempt to check in on a habit you do not own:
select * from public.check_in_habit(<B_habit_id>);
```

Expect `This habit is not available.` (`42501`); no row is written.

### Journal linked-resource ownership

```sql
-- As user A, attempt to link a journal entry to user B's goal:
insert into public.journal_entries (user_id, body, goal_id)
values (auth.uid(), 'Should fail', <B_goal_id>);
```

Expect `That goal is not available.` (`42501`, raised by
`enforce_journal_entry_ownership()`); no row is written. Repeat for
`habit_id` and `prime_assignment_id`.

### Goal completion lock

```sql
-- As the owner of a goal currently 'completed':
update public.goals set progress_percent = 50 where id = <goal_id>;
```

Expect a `23514` (check constraint `goals_completed_progress_full`)
violation; `progress_percent` remains `100`.

## Manual browser verification

**Goals**

1. Create "Launch Diong V1" with the description "Finish, test and deploy
   the first complete Diong release." and a future target date.
2. Add milestones: "Finish personal development features", "Final security
   audit", "Deploy production", "Launch".
3. Complete one milestone (it shows struck-through).
4. Set progress to 25%. Refresh — confirm it persists.
5. Pause → confirm the Resume/Complete/Archive controls change accordingly
   → Resume.
6. Mark complete → confirm progress jumps to 100% and a Reopen control
   appears.
7. Reopen → confirm it returns to Active and progress stays at 100% until
   changed again.
8. As a second account, open `/goals/<first account's goal id>` directly →
   confirm a branded 404.

**Habits**

1. Create "Code Diong", frequency Daily.
2. Check in today. Refresh — confirm the check-in persisted and the streak
   shows 1.
3. Undo the check-in. Refresh — confirm it is gone and the streak shows 0.
4. Check in again.
5. In the Supabase SQL Editor, insert a few back-dated `habit_checkins` rows
   for consecutive prior days (as the table owner, or via
   `check_in_habit` with a past `p_checkin_date`) and confirm
   `/habits/<id>` shows the expected current/longest streak.
6. Archive the habit → confirm it disappears from the "Today" active list
   and no longer accepts a check-in.
7. Reactivate → confirm it returns and can be checked in again.
8. As a second account, open `/habits/<first account's habit id>` directly
   → confirm a branded 404.

**Journal**

1. Create an entry: title "Building Diong", mood Focused, body "Today I
   completed another important part of Diong and reviewed what still needs
   to be done.", linked to the "Launch Diong V1" goal.
2. Save. Refresh `/journal/<id>` — confirm every field persisted, including
   the goal link.
3. Edit the entry (change the body slightly) → confirm the change persists.
4. On `/journal`, search "Diong" → confirm the entry appears.
5. As a second account, open `/journal/<first account's entry id>` directly
   → confirm a branded 404.
6. Confirm journal content never appears in `/feed`, `/discover`,
   `/search`, or any `/profile/<username>` page — search each for a unique
   phrase from the entry's body and confirm zero results.

## Regression

Verify these still work unchanged after Pass 6:
`/daily-prime`, `/daily-prime/history`, `/connections`, `/feed`,
`/discover`, `/search`, `/profile/[username]`, `/messages`, `/communities`,
`/notifications`. Check the app at a 375px viewport — no horizontal
scrolling anywhere, including the new "Growth" header menu and all twelve
new routes.

## Deferred features

Not built in Pass 6, and not advertised as available:

- Recurring/custom habit schedules beyond daily or weekly.
- Milestone reordering, editing or deletion (append and toggle-complete
  only).
- Goal ownership sharing or any cross-user visibility of Goals, Habits or
  the Journal.
- Soft-delete / `archived_at` for journal entries (a confirmed hard delete
  is used instead — see Architecture decisions).
- Per-user timezone support (see the streak algorithm's timezone caveat
  above — shared with Connections' nudge engine).
- AI-assisted goal breakdown, habit suggestions, or journal prompts.
- Any Goals/Habits/Journal surface in the feed, Discover, global Search,
  public profiles, communities, or messages.
