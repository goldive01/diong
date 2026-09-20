// Shared calendar-date helper for the Action & Focus layer (Pass 9) and
// everything that already needed it (Habits, Home). Moved here from
// src/lib/habits/habit-validation.ts, which is the wrong home for a
// cross-feature concept now that Daily Direction needs the exact same
// "what day is it" calculation Habits and Home already relied on.
//
// UTC calendar date, matching every other calendar-day column in the
// database (`current_date`, evaluated in the database session's UTC
// timezone) — public.prime_assignments.assigned_date,
// public.habit_checkins.checkin_date, public.journal_entries.entry_date,
// and now public.daily_directions.direction_date all agree with this value.
// See docs/DAILY_DIRECTION.md for the documented limitation this implies
// near a user's local midnight in a non-UTC timezone.
export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}
