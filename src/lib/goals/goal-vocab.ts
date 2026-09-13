import type { GoalStatus } from "@/src/types/database";

// Runtime mirror of the GoalStatus union in src/types/database.ts, and of
// the goals_status_allowed CHECK constraint in
// 202609130001_goals_habits_journal.sql. The Record<GoalStatus, true>
// annotation makes the compiler reject this file if a union member is
// missing, so database.ts stays the source of truth.

const GOAL_STATUS_SET: Record<GoalStatus, true> = {
  active: true,
  paused: true,
  completed: true,
  archived: true,
};

export const GOAL_STATUSES: readonly GoalStatus[] = Object.keys(
  GOAL_STATUS_SET,
) as GoalStatus[];

export function isGoalStatus(value: unknown): value is GoalStatus {
  return typeof value === "string" && value in GOAL_STATUS_SET;
}
