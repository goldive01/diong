import type { GoalStatus } from "@/src/types/database";

// Display copy for Goals. Pure, deterministic, no data access.

export const GOAL_STATUS_LABEL: Record<GoalStatus, string> = {
  active: "Active",
  paused: "Paused",
  completed: "Completed",
  archived: "Archived",
};

export function goalStatusLabel(status: GoalStatus): string {
  return GOAL_STATUS_LABEL[status];
}

/** Which of the three /goals sections a status belongs to. */
export function goalSection(
  status: GoalStatus,
): "active" | "completed" | "paused_or_archived" {
  if (status === "active") return "active";
  if (status === "completed") return "completed";
  return "paused_or_archived";
}

export function formatTargetDate(targetDate: string | null): string | null {
  if (!targetDate) return null;
  const parsed = new Date(`${targetDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

export function milestoneSummaryLabel(total: number, completed: number): string {
  if (total === 0) return "No milestones yet";
  return `${completed} of ${total} milestone${total === 1 ? "" : "s"} complete`;
}

/** Safe, calm copy for the mutation-wrapper error reasons used across Goals. */
export function goalErrorMessage(
  reason: "not_available" | "invalid" | "unknown",
  fallback?: string,
): string {
  if (fallback) return fallback;
  switch (reason) {
    case "not_available":
      return "This goal is not available.";
    case "invalid":
      return "Check the highlighted fields.";
    default:
      return "Something went wrong. Please try again.";
  }
}
