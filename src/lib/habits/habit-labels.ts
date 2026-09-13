import type { HabitFrequency } from "@/src/types/database";

// Display copy for Habits. Pure, deterministic, no data access.

export const HABIT_FREQUENCY_LABEL: Record<HabitFrequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
};

export function habitFrequencyLabel(frequency: HabitFrequency): string {
  return HABIT_FREQUENCY_LABEL[frequency];
}

export function targetPerPeriodLabel(
  frequency: HabitFrequency,
  targetPerPeriod: number,
): string {
  const unit = frequency === "daily" ? "day" : "week";
  return targetPerPeriod === 1
    ? `Once per ${unit}`
    : `${targetPerPeriod} times per ${unit}`;
}

export function streakLabel(streak: number, frequency: HabitFrequency): string {
  if (streak === 0) return "No current streak";
  const unit = frequency === "daily" ? "day" : "week";
  return `${streak} ${unit}${streak === 1 ? "" : "s"}`;
}

export function formatCheckinDate(checkinDate: string): string {
  const parsed = new Date(`${checkinDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return checkinDate;
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(parsed);
}

export function habitErrorMessage(
  reason: "not_available" | "invalid" | "unknown",
  fallback?: string,
): string {
  if (fallback) return fallback;
  switch (reason) {
    case "not_available":
      return "This habit is not available.";
    case "invalid":
      return "Check the highlighted fields.";
    default:
      return "Something went wrong. Please try again.";
  }
}
