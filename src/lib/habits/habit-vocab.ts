import type { HabitFrequency } from "@/src/types/database";

// Runtime mirror of the HabitFrequency union in src/types/database.ts, and
// of the habits_frequency_allowed CHECK constraint in
// 202609130001_goals_habits_journal.sql.

const HABIT_FREQUENCY_SET: Record<HabitFrequency, true> = {
  daily: true,
  weekly: true,
};

export const HABIT_FREQUENCIES: readonly HabitFrequency[] = Object.keys(
  HABIT_FREQUENCY_SET,
) as HabitFrequency[];

export function isHabitFrequency(value: unknown): value is HabitFrequency {
  return typeof value === "string" && value in HABIT_FREQUENCY_SET;
}
