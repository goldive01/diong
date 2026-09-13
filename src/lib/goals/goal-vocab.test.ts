import { describe, expect, it } from "vitest";
import { GOAL_STATUSES, isGoalStatus } from "./goal-vocab";

describe("goal vocab", () => {
  it("exposes the four goal statuses", () => {
    expect([...GOAL_STATUSES]).toEqual(["active", "paused", "completed", "archived"]);
  });

  it("isGoalStatus accepts only known statuses", () => {
    for (const status of GOAL_STATUSES) {
      expect(isGoalStatus(status)).toBe(true);
    }
    for (const value of ["", "done", "cancelled", 1, null, undefined, {}]) {
      expect(isGoalStatus(value)).toBe(false);
    }
  });
});
