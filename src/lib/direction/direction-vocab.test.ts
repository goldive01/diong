import { describe, expect, it } from "vitest";
import { DIRECTION_STATUSES, isDirectionStatus } from "./direction-vocab";

describe("direction vocab", () => {
  it("exposes active, completed and skipped", () => {
    expect([...DIRECTION_STATUSES]).toEqual(["active", "completed", "skipped"]);
  });

  it("isDirectionStatus accepts only known statuses", () => {
    for (const status of DIRECTION_STATUSES) {
      expect(isDirectionStatus(status)).toBe(true);
    }
    for (const value of ["", "paused", "archived", 1, null, undefined, {}]) {
      expect(isDirectionStatus(value)).toBe(false);
    }
  });
});
