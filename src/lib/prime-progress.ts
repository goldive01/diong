// Pure Daily Prime progress calculations (Phase G). No data access, no React.
//
// Operates only on assignment/completion dates the caller has already loaded.
// The Prime assignment engine lives in SQL (get_or_assign_daily_prime); this
// module does not reimplement or duplicate it — it only counts records the
// engine produced.
//
// Timezone note: `assignedDate` values are UTC calendar dates (assigned_date
// defaults to `current_date`, evaluated in the database's UTC session). The
// `today` argument should likewise be a UTC calendar date. Comparisons here are
// plain calendar-day arithmetic on date strings, not timezone conversions.

export type PrimeProgressInput = {
  /** The assignment's assigned_date, an ISO "YYYY-MM-DD" calendar date. */
  assignedDate: string;
  /** Whether a completion row exists for that assignment. */
  completed: boolean;
};

export type PrimeProgress = {
  totalAssigned: number;
  totalCompleted: number;
  /** completed / assigned as a 0–100 integer percentage. 0 when none assigned. */
  completionRate: number;
  /**
   * Consecutive completed assignments ending at the most recent assignment,
   * counted only while the streak is still "live" — i.e. the latest assignment
   * is today or yesterday relative to `today`. 0 when the latest assignment is
   * not completed, or is older than yesterday.
   */
  currentStreak: number;
  /**
   * Longest run of consecutive-calendar-day completed assignments anywhere in
   * the history. Independent of `today`.
   */
  longestStreak: number;
};

function parseCalendarDate(iso: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const utc = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(utc) ? null : utc;
}

/**
 * Whole calendar days from `from` to `to` (both ISO "YYYY-MM-DD"). Positive when
 * `to` is later. Returns `null` if either value is unparseable.
 */
export function differenceInCalendarDays(
  from: string,
  to: string,
): number | null {
  const a = parseCalendarDate(from);
  const b = parseCalendarDate(to);
  if (a === null || b === null) return null;
  return Math.round((b - a) / 86_400_000);
}

export function calculatePrimeProgress(
  rows: readonly PrimeProgressInput[],
  today: string,
): PrimeProgress {
  const ordered = rows
    .filter((row) => parseCalendarDate(row.assignedDate) !== null)
    .slice()
    .sort((a, b) => a.assignedDate.localeCompare(b.assignedDate));

  const totalAssigned = ordered.length;
  const totalCompleted = ordered.filter((row) => row.completed).length;
  const completionRate =
    totalAssigned === 0
      ? 0
      : Math.round((totalCompleted / totalAssigned) * 100);

  let longestStreak = 0;
  let run = 0;
  for (let i = 0; i < ordered.length; i += 1) {
    const row = ordered[i];
    if (!row.completed) {
      run = 0;
      continue;
    }
    const previous = ordered[i - 1];
    const consecutive =
      previous !== undefined &&
      previous.completed &&
      differenceInCalendarDays(previous.assignedDate, row.assignedDate) === 1;
    run = consecutive ? run + 1 : 1;
    if (run > longestStreak) longestStreak = run;
  }

  let currentStreak = 0;
  const latest = ordered[ordered.length - 1];
  if (latest !== undefined && latest.completed) {
    const gapFromToday = differenceInCalendarDays(latest.assignedDate, today);
    if (gapFromToday !== null && gapFromToday >= 0 && gapFromToday <= 1) {
      currentStreak = 1;
      for (let i = ordered.length - 2; i >= 0; i -= 1) {
        const row = ordered[i];
        const next = ordered[i + 1];
        const consecutive =
          row.completed &&
          differenceInCalendarDays(row.assignedDate, next.assignedDate) === 1;
        if (!consecutive) break;
        currentStreak += 1;
      }
    }
  }

  return {
    totalAssigned,
    totalCompleted,
    completionRate,
    currentStreak,
    longestStreak,
  };
}
