import type { JournalMood } from "@/src/types/database";

// Runtime mirror of the JournalMood union in src/types/database.ts, and of
// the journal_entries_mood_allowed CHECK constraint in
// 202609130001_goals_habits_journal.sql. Moods are self-reported vocabulary
// for reflection, never a diagnosis.

const JOURNAL_MOOD_SET: Record<JournalMood, true> = {
  calm: true,
  focused: true,
  energised: true,
  neutral: true,
  stressed: true,
  low: true,
  grateful: true,
  reflective: true,
};

export const JOURNAL_MOODS: readonly JournalMood[] = Object.keys(
  JOURNAL_MOOD_SET,
) as JournalMood[];

export function isJournalMood(value: unknown): value is JournalMood {
  return typeof value === "string" && value in JOURNAL_MOOD_SET;
}
