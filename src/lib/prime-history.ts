// Pure helpers for the Daily Prime history list and detail views (Phase G):
// route-param parsing and display formatting only. No data access, no React.

export type PrimeHistoryItem = {
  id: number;
  assignedDate: string;
  categoryName: string | null;
  title: string | null;
  completed: boolean;
  completedAt: string | null;
  hasReflection: boolean;
};

export type PrimeHistoryDetail = {
  id: number;
  assignedDate: string;
  categoryName: string | null;
  title: string | null;
  purpose: string | null;
  bestTime: string | null;
  primeText: string | null;
  actionTrigger: string | null;
  tomorrowsExpectation: string | null;
  reflectionPrompt: string | null;
  completed: boolean;
  completedAt: string | null;
  reflection: string | null;
  isToday: boolean;
};

/**
 * Parse a dynamic-route `assignmentId` segment into a positive integer id.
 *
 * Returns `null` for anything that is not a base-10 positive safe integer —
 * `""`, `"0"`, `"1.5"`, `"1e3"`, `"-1"`, `"1abc"`, `undefined` — so the page can
 * `notFound()`. Mirrors `parseConnectionId` in the Connections feature.
 */
export function parsePrimeAssignmentId(raw: string | undefined): number | null {
  if (typeof raw !== "string" || !/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

const ASSIGNED_DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const COMPLETED_AT_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * "Monday, 8 September 2026" for an ISO calendar date ("YYYY-MM-DD"). Formatted
 * in UTC (assigned_date is a UTC calendar date) so it never shifts a day.
 * Returns "" for an unparseable value.
 */
export function formatAssignedDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const date = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return "";
  return ASSIGNED_DATE_FORMAT.format(date);
}

/**
 * Absolute date and time a completion was recorded. Returns "" for a missing or
 * unparseable value so callers can choose their own fallback copy.
 */
export function formatCompletedAt(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return COMPLETED_AT_FORMAT.format(date);
}

/** Plain-language completion state for a history row or detail badge. */
export function describeCompletionState(completed: boolean): string {
  return completed ? "Completed" : "Not completed";
}
