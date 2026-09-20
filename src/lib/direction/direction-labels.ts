import type { DailyDirectionStatus } from "@/src/types/database";

// Display copy for Daily Direction. Pure, deterministic, no data access.

export const DIRECTION_STATUS_LABEL: Record<DailyDirectionStatus, string> = {
  active: "Active",
  completed: "Completed",
  skipped: "Skipped",
};

export function directionStatusLabel(status: DailyDirectionStatus): string {
  return DIRECTION_STATUS_LABEL[status];
}

export function formatDirectionDate(directionDate: string): string {
  const parsed = new Date(`${directionDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return directionDate;
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(parsed);
}

/** Safe, calm copy for the ownership-check reasons used across the Daily
 * Direction actions. Mirrors goalErrorMessage() / habitErrorMessage(). */
export function directionErrorMessage(
  reason: "not_available" | "invalid" | "unknown",
  fallback?: string,
): string {
  if (fallback) return fallback;
  switch (reason) {
    case "not_available":
      return "This direction is not available.";
    case "invalid":
      return "Check the highlighted fields.";
    default:
      return "Something went wrong. Please try again.";
  }
}
