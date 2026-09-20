import type { DailyDirectionStatus } from "@/src/types/database";

// Runtime mirror of the DailyDirectionStatus union in
// src/types/database.ts, and of the daily_directions_status_allowed CHECK
// constraint in 202609150001_daily_direction.sql. The
// Record<DailyDirectionStatus, true> annotation makes the compiler reject
// this file if a union member is missing, so database.ts stays the source
// of truth.

const DIRECTION_STATUS_SET: Record<DailyDirectionStatus, true> = {
  active: true,
  completed: true,
  skipped: true,
};

export const DIRECTION_STATUSES: readonly DailyDirectionStatus[] = Object.keys(
  DIRECTION_STATUS_SET,
) as DailyDirectionStatus[];

export function isDirectionStatus(value: unknown): value is DailyDirectionStatus {
  return typeof value === "string" && value in DIRECTION_STATUS_SET;
}
