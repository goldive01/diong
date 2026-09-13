import { describe, expect, it } from "vitest";
import { HABIT_FREQUENCIES, isHabitFrequency } from "./habit-vocab";

describe("habit vocab", () => {
  it("exposes daily and weekly", () => {
    expect([...HABIT_FREQUENCIES]).toEqual(["daily", "weekly"]);
  });

  it("isHabitFrequency accepts only known frequencies", () => {
    for (const frequency of HABIT_FREQUENCIES) {
      expect(isHabitFrequency(frequency)).toBe(true);
    }
    for (const value of ["", "monthly", "hourly", 1, null, undefined, {}]) {
      expect(isHabitFrequency(value)).toBe(false);
    }
  });
});
