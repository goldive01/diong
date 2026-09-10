# Daily Prime History, Reflections and Progress (Phase G)

Phase G turns the Daily Prime from a single-day card into an ongoing practice:
a completion reflection, a history list, an individual historical detail view,
and a small text-only progress summary. No AI, no social features, no
notifications, no auth/onboarding changes. Connections is untouched.

## Migration

**One additive migration — not applied automatically.**

`supabase/migrations/202609100001_prime_reflections.sql`

- Adds `public.prime_completions.reflection text` plus a
  `check (reflection is null or char_length(reflection) <= 2000)` constraint.
- Adds `public.save_prime_reflection(p_assignment_id bigint, p_reflection text)
  returns timestamptz` — `security definer`, `set search_path = ''`, all
  identifiers schema-qualified.
- Changes nothing else. No existing table, RPC, grant or policy is altered.
  `public.prime_completions` keeps SELECT-only access for `authenticated`; the
  reflection is written only by the new function, matching the Prime engine's
  existing RPC-only write model.

Apply it once, in order, after `202609080001_fix_daily_prime_assigned_date.sql`,
using `supabase db push` or by pasting the file into the Supabase SQL Editor.
The file is wrapped in a single `begin; … commit;` and is not idempotent
(`create function`, not `create or replace`).

### `save_prime_reflection(...)` behaviour

All in one transaction:

1. Require an authenticated user (`42501` otherwise).
2. `nullif(btrim(coalesce(p_reflection, '')), '')` — blank becomes `null`.
   Reject longer than 2000 characters (`22023`) before any write.
3. Require a `prime_assignments` row with `id = p_assignment_id`,
   `user_id = auth.uid()` **and** `assigned_date = current_date`. Historical
   assignments are read-only; another user's assignment is invisible (`42501`).
4. `update public.prime_completions set reflection = …` for that assignment and
   user. If no completion row exists yet, `42501` ("Complete today's Prime
   before saving a reflection.").
5. Only `reflection` is written. `completed_at`, `completion_date`, `user_id`
   and `prime_assignment_id` are never touched — `completed_at` stays
   authoritative.

## Reflection (`/daily-prime`)

- The reflection form renders **only after** today's Action Trigger is marked
  complete (`prime.completed_at` present). It never appears before completion.
- Heading is the protocol's `reflection_prompt`, or
  `DEFAULT_REFLECTION_PROMPT` when the protocol has none.
- Optional. Trimmed. Max 2000 characters (client `maxLength` + client validate
  + server validate + DB `CHECK`).
- The textarea is prefilled from the saved reflection, so re-submitting is an
  update. Saving `""` clears it.
- A validation failure keeps what the user typed (server echoes `values`).
- Raw Supabase/Postgres errors are only `console.error`'d; the browser shows a
  fixed generic message.
- `savePrimeReflection` takes the assignment id as a **bound first argument**
  from the server component — it is never a form field.

## History list (`/daily-prime/history`)

- `requireCompletedProfile()`, then `listPrimeHistory(supabase, userId)` +
  `getPrimeProgress(supabase, userId)`.
- Assignments newest first (`assigned_date desc, id desc`). Each row: assigned
  date, category, title, completed / not completed, completed time, and a small
  "Reflection saved" marker when one exists.
- The full reflection text is **not** on the list — only a boolean flag.
- Empty state: "Your Prime journey starts with today's practice." + an
  "Open today's Prime" button. The progress summary is hidden when there is no
  history.
- If the history read fails the page shows an empty list rather than an error;
  progress falls back to all-zeros.

## Historical detail (`/daily-prime/history/[assignmentId]`)

- `requireCompletedProfile()`, `parsePrimeAssignmentId()` (positive base-10
  integer only), then `getPrimeHistoryAssignment(supabase, userId, id)`.
- A non-numeric id, a missing assignment, or another user's assignment all
  return `notFound()` (the data function returns `null` for every one).
- Shows assigned date, category, title, purpose, best time, prime text, action
  trigger, tomorrow's expectation, reflection prompt, completion state,
  completed timestamp and the saved reflection.
- Read-only. When the assignment is **today's**, it links to `/daily-prime`
  where the reflection can be added or updated. No completion or reassignment
  is ever possible from this page.

## Progress summary

`calculatePrimeProgress(rows, today)` (pure, in `src/lib/prime-progress.ts`),
fed by `getPrimeProgress`:

| Metric | Definition |
| --- | --- |
| Prime days | count of the user's assignments |
| Completed | count of those with a completion row |
| Completion rate | `round(completed / assigned * 100)`; `0` when none assigned |
| Current streak | consecutive-calendar-day completed assignments ending at the most recent assignment, **only if** that assignment is today or yesterday; otherwise `0` |
| Longest streak | longest run of consecutive-calendar-day completed assignments in the whole history |

No XP, levels, badges, ranks, scores or charts. All figures come from real
assignment/completion dates.

### Streak timezone note

`assigned_date` is a UTC calendar date (`current_date` in the DB's UTC
session), and `getPrimeProgress` passes today's UTC date. Streak maths is plain
calendar-day differencing of `YYYY-MM-DD` strings — no timezone conversion. The
only edge is the same one the whole Prime engine already has (documented in
`CONNECTIONS_SETUP.md`): a user many hours from UTC, near their local midnight,
may see the *current* streak treat "today/yesterday" up to a day early or late.
Totals, completion rate and the longest streak are unaffected. A per-user
timezone would resolve this for the Prime engine and Connections together and
is out of scope for this phase.

## Home integration

`/home` gains one secondary link — "View Prime history" — beneath the existing
"Open today's Prime" button inside the Daily Prime card. The card is not
redesigned. The Connections Phase F card is unchanged.

## Files

| Area | File |
| --- | --- |
| Migration | `supabase/migrations/202609100001_prime_reflections.sql` |
| Types | `src/types/database.ts` (`PrimeCompletion.reflection`, `save_prime_reflection` in `Functions`) |
| Pure logic | `src/lib/prime-reflection.ts`, `src/lib/prime-history.ts`, `src/lib/prime-progress.ts` |
| Data | `src/lib/prime-data.ts` (`getPrimeReflection`, `listPrimeHistory`, `getPrimeHistoryAssignment`, `getPrimeProgress`) |
| Action | `app/(protected)/daily-prime/actions.ts` (`savePrimeReflection`) |
| Components | `src/components/prime/prime-reflection-form.tsx`, `prime-history-list.tsx`, `prime-history-detail.tsx`, `prime-progress-summary.tsx` |
| Routes | `app/(protected)/daily-prime/history/page.tsx`, `app/(protected)/daily-prime/history/[assignmentId]/page.tsx` |
| Modified pages | `app/(protected)/daily-prime/page.tsx`, `app/(protected)/home/page.tsx` |
| Tests | `src/lib/prime-reflection.test.ts`, `src/lib/prime-progress.test.ts`, `src/lib/prime-history.test.ts` |

## Manual verification

Manual browser checks must wait until the migration is applied.

1. Open `/daily-prime`, mark the Action Trigger complete → the reflection form
   appears with the protocol's reflection prompt.
2. Type a reflection, "Save reflection" → "Reflection saved."
3. Reload `/daily-prime` → the reflection is still in the textarea.
4. Edit the text, save again → the new text persists on reload. Clear it and
   save → it is emptied.
5. Open `/daily-prime/history` → today's Prime is listed with "Completed" and
   "Reflection saved".
6. Confirm rows are newest first.
7. Open a history row → the detail shows every protocol field, the completion
   time and the saved reflection, read-only.
8. Visit `/daily-prime/history/abc`, `/daily-prime/history/999999`, and (as a
   second user) the first user's assignment id → all 404.
9. Check the progress numbers against the raw rows in Supabase
   (`select assigned_date from prime_assignments where user_id = …`,
   `select prime_assignment_id from prime_completions where user_id = …`).
10. `/home` → "View Prime history" link opens `/daily-prime/history`.
11. `/home` → the Connections card is exactly as in Phase F.
12. All four screens at 375 px → no horizontal scroll.
13. `/daily-prime` completion flow still works exactly as before.
