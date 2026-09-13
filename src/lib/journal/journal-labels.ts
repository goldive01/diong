import type { JournalMood } from "@/src/types/database";

// Display copy for the private Journal. Pure, deterministic, no data access.

export const JOURNAL_MOOD_LABEL: Record<JournalMood, string> = {
  calm: "Calm",
  focused: "Focused",
  energised: "Energised",
  neutral: "Neutral",
  stressed: "Stressed",
  low: "Low",
  grateful: "Grateful",
  reflective: "Reflective",
};

export function journalMoodLabel(mood: JournalMood | null): string | null {
  return mood ? JOURNAL_MOOD_LABEL[mood] : null;
}

const PREVIEW_CHARS = 160;

/** A single-line preview of a journal body: whitespace collapsed, truncated
 * with an ellipsis. Never used to expose journal content anywhere the body
 * itself would not otherwise be shown (/journal is private to its owner). */
export function journalPreview(body: string): string {
  const collapsed = body.replace(/\s+/g, " ").trim();
  if (collapsed.length <= PREVIEW_CHARS) return collapsed;
  return `${collapsed.slice(0, PREVIEW_CHARS).trimEnd()}…`;
}

export function formatEntryDate(entryDate: string): string {
  const parsed = new Date(`${entryDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return entryDate;
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

export function journalErrorMessage(
  reason: "not_available" | "invalid" | "unknown",
  fallback?: string,
): string {
  if (fallback) return fallback;
  switch (reason) {
    case "not_available":
      return "This entry is not available.";
    case "invalid":
      return "Check the highlighted fields.";
    default:
      return "Something went wrong. Please try again.";
  }
}
