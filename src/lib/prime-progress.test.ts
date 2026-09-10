import { describe, expect, it } from "vitest";
import {
  calculatePrimeProgress,
  differenceInCalendarDays,
  type PrimeProgressInput,
} from "./prime-progress";

function day(iso: string, completed: boolean): PrimeProgressInput {
  return { assignedDate: iso, completed };
}

describe("differenceInCalendarDays", () => {
  it("counts whole days, signed", () => {
    expect(differenceInCalendarDays("2026-09-01", "2026-09-02")).toBe(1);
    expect(differenceInCalendarDays("2026-09-02", "2026-09-01")).toBe(-1);
    expect(differenceInCalendarDays("2026-09-01", "2026-09-01")).toBe(0);
  });

  it("spans month and year boundaries", () => {
    expect(differenceInCalendarDays("2026-01-31", "2026-02-01")).toBe(1);
    expect(differenceInCalendarDays("2025-12-31", "2026-01-01")).toBe(1);
  });

  it("returns null for an unparseable date", () => {
    expect(differenceInCalendarDays("nope", "2026-09-01")).toBeNull();
    expect(differenceInCalendarDays("2026-09-01", "2026-9-1")).toBeNull();
  });
});

describe("calculatePrimeProgress", () => {
  it("handles no assignments without dividing by zero", () => {
    expect(calculatePrimeProgress([], "2026-09-10")).toEqual({
      totalAssigned: 0,
      totalCompleted: 0,
      completionRate: 0,
      currentStreak: 0,
      longestStreak: 0,
    });
  });

  it("counts totals and rounds the completion rate", () => {
    const rows = [
      day("2026-09-01", true),
      day("2026-09-02", false),
      day("2026-09-03", true),
    ];
    const progress = calculatePrimeProgress(rows, "2026-09-10");
    expect(progress.totalAssigned).toBe(3);
    expect(progress.totalCompleted).toBe(2);
    expect(progress.completionRate).toBe(67); // 66.66 -> 67
  });

  it("counts a full unbroken streak", () => {
    const rows = [
      day("2026-09-08", true),
      day("2026-09-09", true),
      day("2026-09-10", true),
    ];
    const progress = calculatePrimeProgress(rows, "2026-09-10");
    expect(progress.longestStreak).toBe(3);
    expect(progress.currentStreak).toBe(3);
    expect(progress.completionRate).toBe(100);
  });

  it("breaks the streak on a missed completion and on a calendar gap", () => {
    const missed = calculatePrimeProgress(
      [day("2026-09-08", true), day("2026-09-09", false), day("2026-09-10", true)],
      "2026-09-10",
    );
    expect(missed.longestStreak).toBe(1);
    expect(missed.currentStreak).toBe(1);

    const gap = calculatePrimeProgress(
      [day("2026-09-06", true), day("2026-09-08", true), day("2026-09-09", true)],
      "2026-09-10",
    );
    // 06 stands alone (gap to 08); 08-09 are consecutive.
    expect(gap.longestStreak).toBe(2);
    expect(gap.currentStreak).toBe(2);
  });

  it("reports no current streak when the latest assignment is not completed", () => {
    const progress = calculatePrimeProgress(
      [day("2026-09-09", true), day("2026-09-10", false)],
      "2026-09-10",
    );
    expect(progress.currentStreak).toBe(0);
    expect(progress.longestStreak).toBe(1);
  });

  it("keeps the current streak alive when the latest assignment is yesterday", () => {
    const progress = calculatePrimeProgress(
      [day("2026-09-08", true), day("2026-09-09", true)],
      "2026-09-10",
    );
    expect(progress.currentStreak).toBe(2);
  });

  it("drops the current streak when the latest assignment is stale, keeping longest", () => {
    const progress = calculatePrimeProgress(
      [day("2026-09-01", true), day("2026-09-02", true), day("2026-09-03", true)],
      "2026-09-10",
    );
    expect(progress.currentStreak).toBe(0);
    expect(progress.longestStreak).toBe(3);
  });

  it("is order-independent", () => {
    const rows = [
      day("2026-09-10", true),
      day("2026-09-08", true),
      day("2026-09-09", true),
    ];
    const progress = calculatePrimeProgress(rows, "2026-09-10");
    expect(progress.currentStreak).toBe(3);
    expect(progress.longestStreak).toBe(3);
  });
});
