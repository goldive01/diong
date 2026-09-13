import { describe, expect, it } from "vitest";
import {
  calculateHabitStreak,
  differenceInCalendarDays,
  mondayOf,
  type HabitCheckinInput,
} from "./habit-streak";

const TODAY = "2026-09-12";

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function checkin(checkinDate: string, value = 1): HabitCheckinInput {
  return { checkinDate, value };
}

describe("differenceInCalendarDays", () => {
  it("computes whole calendar days between two dates", () => {
    expect(differenceInCalendarDays("2026-09-10", "2026-09-12")).toBe(2);
    expect(differenceInCalendarDays("2026-09-12", "2026-09-10")).toBe(-2);
    expect(differenceInCalendarDays("2026-09-12", "2026-09-12")).toBe(0);
  });

  it("returns null for an unparseable date", () => {
    expect(differenceInCalendarDays("not-a-date", "2026-09-12")).toBeNull();
    expect(differenceInCalendarDays("2026-09-12", "not-a-date")).toBeNull();
  });
});

describe("mondayOf", () => {
  it("is idempotent", () => {
    const monday = mondayOf(TODAY)!;
    expect(mondayOf(monday)).toBe(monday);
  });

  it("returns a date that really is a Monday", () => {
    const monday = mondayOf(TODAY)!;
    const parsed = new Date(`${monday}T00:00:00Z`);
    expect(parsed.getUTCDay()).toBe(1);
  });

  it("maps every day in the same week to the same Monday", () => {
    const monday = mondayOf(TODAY)!;
    for (let offset = 0; offset < 7; offset += 1) {
      expect(mondayOf(addDays(monday, offset))).toBe(monday);
    }
  });

  it("returns null for an unparseable date", () => {
    expect(mondayOf("not-a-date")).toBeNull();
  });
});

describe("calculateHabitStreak — daily", () => {
  it("is all zero with no check-ins", () => {
    expect(calculateHabitStreak([], "daily", 1, TODAY)).toEqual({
      currentStreak: 0,
      longestStreak: 0,
      totalCheckins: 0,
    });
  });

  it("counts a consecutive run ending today", () => {
    const checkins = [
      checkin(TODAY),
      checkin(addDays(TODAY, -1)),
      checkin(addDays(TODAY, -2)),
    ];
    const result = calculateHabitStreak(checkins, "daily", 1, TODAY);
    expect(result).toEqual({ currentStreak: 3, longestStreak: 3, totalCheckins: 3 });
  });

  it("stays live when the most recent check-in was yesterday", () => {
    const checkins = [checkin(addDays(TODAY, -1)), checkin(addDays(TODAY, -2))];
    const result = calculateHabitStreak(checkins, "daily", 1, TODAY);
    expect(result.currentStreak).toBe(2);
  });

  it("is not live when the most recent check-in was two days ago", () => {
    const checkins = [checkin(addDays(TODAY, -2)), checkin(addDays(TODAY, -3))];
    const result = calculateHabitStreak(checkins, "daily", 1, TODAY);
    expect(result.currentStreak).toBe(0);
  });

  it("never fabricates a missing day: a gap breaks the streak", () => {
    // Two separate runs: an older 3-day run, then a gap, then a live 2-day run.
    const checkins = [
      checkin(TODAY),
      checkin(addDays(TODAY, -1)),
      // gap at TODAY-2
      checkin(addDays(TODAY, -3)),
      checkin(addDays(TODAY, -4)),
      checkin(addDays(TODAY, -5)),
    ];
    const result = calculateHabitStreak(checkins, "daily", 1, TODAY);
    expect(result.currentStreak).toBe(2);
    expect(result.longestStreak).toBe(3);
    expect(result.totalCheckins).toBe(5);
  });

  it("treats an under-target day as unmet", () => {
    const checkins = [checkin(TODAY, 2), checkin(addDays(TODAY, -1), 2)];
    const result = calculateHabitStreak(checkins, "daily", 3, TODAY);
    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(0);
    expect(result.totalCheckins).toBe(2);
  });

  it("meets an exact-target day", () => {
    const checkins = [checkin(TODAY, 3)];
    const result = calculateHabitStreak(checkins, "daily", 3, TODAY);
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
  });

  it("finds the longest historical run even when it is not the live one", () => {
    const checkins = [
      checkin(addDays(TODAY, -10)),
      checkin(addDays(TODAY, -9)),
      checkin(addDays(TODAY, -8)),
      checkin(addDays(TODAY, -7)),
      // gap
      checkin(TODAY),
    ];
    const result = calculateHabitStreak(checkins, "daily", 1, TODAY);
    expect(result.longestStreak).toBe(4);
    expect(result.currentStreak).toBe(1);
  });
});

describe("calculateHabitStreak — weekly", () => {
  it("counts consecutive met weeks ending in the current week", () => {
    const monday = mondayOf(TODAY)!;
    const checkins = [
      checkin(monday, 3),
      checkin(addDays(monday, -7), 3),
      checkin(addDays(monday, -14), 3),
    ];
    const result = calculateHabitStreak(checkins, "weekly", 3, TODAY);
    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBe(3);
    expect(result.totalCheckins).toBe(3);
  });

  it("sums multiple check-ins within the same week toward the target", () => {
    const monday = mondayOf(TODAY)!;
    const checkins = [
      checkin(monday, 2),
      checkin(addDays(monday, 2), 2), // same week, different day
    ];
    const result = calculateHabitStreak(checkins, "weekly", 3, TODAY);
    expect(result.currentStreak).toBe(1);
    expect(result.totalCheckins).toBe(2);
  });

  it("stays live when the most recent met week was last week", () => {
    const monday = mondayOf(TODAY)!;
    const checkins = [checkin(addDays(monday, -7), 3)];
    const result = calculateHabitStreak(checkins, "weekly", 3, TODAY);
    expect(result.currentStreak).toBe(1);
  });

  it("is not live when the most recent met week was two weeks ago", () => {
    const monday = mondayOf(TODAY)!;
    const checkins = [checkin(addDays(monday, -14), 3)];
    const result = calculateHabitStreak(checkins, "weekly", 3, TODAY);
    expect(result.currentStreak).toBe(0);
  });

  it("a non-consecutive week breaks the streak", () => {
    const monday = mondayOf(TODAY)!;
    const checkins = [
      checkin(monday, 3),
      // week at -7 missing entirely
      checkin(addDays(monday, -14), 3),
      checkin(addDays(monday, -21), 3),
    ];
    const result = calculateHabitStreak(checkins, "weekly", 3, TODAY);
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(2);
  });
});
