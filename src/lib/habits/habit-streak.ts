// Pure habit streak calculations. No data access, no React.
//
// Operates only on check-in rows the caller has already loaded (bounded —
// see habits-data.ts). Deterministic: no randomness, nothing fabricated for a
// missing day. Mirrors the shape of src/lib/prime-progress.ts (date-string
// diffing, `today` injected as a parameter) rather than inventing a second
// streak engine style.
//
// Timezone note: `checkinDate` values are plain calendar dates
// (habit_checkins.checkin_date, a `date` column) and `today` should likewise
// be a plain "YYYY-MM-DD" calendar date. Comparisons here are calendar-day
// arithmetic on date strings, not timezone-aware instants. Diong does not yet
// have per-user timezone support (see docs/GOALS_HABITS_JOURNAL.md) — a
// user several hours from UTC may see a streak roll over up to a day before
// or after their own local midnight, the same caveat Connections' nudge
// engine already documents.

import type { HabitFrequency } from "@/src/types/database";

export type HabitCheckinInput = {
  /** ISO "YYYY-MM-DD" calendar date. */
  checkinDate: string;
  value: number;
};

export type HabitStreak = {
  currentStreak: number;
  longestStreak: number;
  totalCheckins: number;
};

function parseCalendarDate(iso: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const utc = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(utc) ? null : utc;
}

/** Whole calendar days from `from` to `to` (both ISO "YYYY-MM-DD"). Positive
 * when `to` is later. Returns null if either value is unparseable. */
export function differenceInCalendarDays(from: string, to: string): number | null {
  const a = parseCalendarDate(from);
  const b = parseCalendarDate(to);
  if (a === null || b === null) return null;
  return Math.round((b - a) / 86_400_000);
}

/** The Monday (ISO "YYYY-MM-DD") of the calendar week containing `iso`. */
export function mondayOf(iso: string): string | null {
  const parsed = parseCalendarDate(iso);
  if (parsed === null) return null;
  const date = new Date(parsed);
  // getUTCDay(): 0 = Sunday .. 6 = Saturday. Days to subtract to reach Monday.
  const dayOfWeek = date.getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(parsed - daysSinceMonday * 86_400_000);
  return monday.toISOString().slice(0, 10);
}

type Period = { key: string; totalValue: number };

function buildPeriods(
  checkins: readonly HabitCheckinInput[],
  frequency: HabitFrequency,
): Period[] {
  const totals = new Map<string, number>();
  for (const checkin of checkins) {
    const key =
      frequency === "daily" ? checkin.checkinDate : mondayOf(checkin.checkinDate);
    if (key === null) continue;
    totals.set(key, (totals.get(key) ?? 0) + checkin.value);
  }
  return [...totals.entries()]
    .map(([key, totalValue]) => ({ key, totalValue }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Calculates a habit's current and longest streak, plus its total number of
 * recorded check-ins.
 *
 * Daily: consecutive calendar dates whose check-in value meets
 * `targetPerPeriod`. Weekly: consecutive calendar weeks (Monday–Sunday)
 * whose check-in values sum to at least `targetPerPeriod`. A missing day/week
 * — no check-in row at all — breaks the streak exactly like an
 * under-target one; nothing is fabricated for it.
 *
 * `currentStreak` is only "live" (non-zero) when the most recent met period
 * is the current one or the immediately preceding one — the same
 * today-or-yesterday window `calculatePrimeProgress` uses — so a habit that
 * has gone stale reports 0, not a frozen historical count.
 */
export function calculateHabitStreak(
  checkins: readonly HabitCheckinInput[],
  frequency: HabitFrequency,
  targetPerPeriod: number,
  today: string,
): HabitStreak {
  const stepDays = frequency === "daily" ? 1 : 7;
  const todayKey = frequency === "daily" ? today : (mondayOf(today) ?? today);
  const periods = buildPeriods(checkins, frequency);
  const totalCheckins = checkins.length;

  let longestStreak = 0;
  let run = 0;
  for (let i = 0; i < periods.length; i += 1) {
    const period = periods[i];
    const met = period.totalValue >= targetPerPeriod;
    if (!met) {
      run = 0;
      continue;
    }
    const previous = periods[i - 1];
    const consecutive =
      previous !== undefined &&
      previous.totalValue >= targetPerPeriod &&
      differenceInCalendarDays(previous.key, period.key) === stepDays;
    run = consecutive ? run + 1 : 1;
    if (run > longestStreak) longestStreak = run;
  }

  let currentStreak = 0;
  let lastMetIndex = -1;
  for (let i = periods.length - 1; i >= 0; i -= 1) {
    if (periods[i].totalValue >= targetPerPeriod) {
      lastMetIndex = i;
      break;
    }
  }
  if (lastMetIndex !== -1) {
    const gap = differenceInCalendarDays(periods[lastMetIndex].key, todayKey);
    if (gap !== null && gap >= 0 && gap <= stepDays) {
      currentStreak = 1;
      for (let i = lastMetIndex - 1; i >= 0; i -= 1) {
        const period = periods[i];
        const next = periods[i + 1];
        const consecutive =
          period.totalValue >= targetPerPeriod &&
          differenceInCalendarDays(period.key, next.key) === stepDays;
        if (!consecutive) break;
        currentStreak += 1;
      }
    }
  }

  return { currentStreak, longestStreak, totalCheckins };
}
