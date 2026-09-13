import { describe, expect, it } from "vitest";
import {
  hasHabitErrors,
  normalizeCheckinInput,
  normalizeHabitInput,
  parseCheckinDate,
  parseHabitId,
  validateCheckinInput,
  validateHabitInput,
  type HabitInput,
} from "./habit-validation";

function input(overrides: Partial<HabitInput> = {}): HabitInput {
  return {
    name: "Code Diong",
    description: "",
    frequency: "daily",
    targetPerPeriod: "1",
    ...overrides,
  };
}

describe("normalizeHabitInput", () => {
  it("trims text fields and defaults targetPerPeriod to 1 when blank", () => {
    expect(
      normalizeHabitInput({ name: "  Code  ", description: "  Ship  ", frequency: "  daily  " }),
    ).toEqual({ name: "Code", description: "Ship", frequency: "daily", targetPerPeriod: "1" });
  });

  it("keeps a provided targetPerPeriod", () => {
    expect(normalizeHabitInput({ targetPerPeriod: "3" }).targetPerPeriod).toBe("3");
  });

  it("carries a non-numeric targetPerPeriod through as NaN text for validation to reject", () => {
    expect(Number.isNaN(Number(normalizeHabitInput({ targetPerPeriod: "abc" }).targetPerPeriod))).toBe(
      true,
    );
  });
});

describe("validateHabitInput", () => {
  it("accepts a minimal valid input", () => {
    expect(validateHabitInput(input())).toEqual({});
  });

  it("rejects an empty name", () => {
    expect(validateHabitInput(input({ name: "" })).name).toBeDefined();
  });

  it("rejects a name longer than 120 characters", () => {
    expect(validateHabitInput(input({ name: "a".repeat(121) })).name).toBeDefined();
  });

  it("rejects a description over 1000 characters", () => {
    expect(
      validateHabitInput(input({ description: "a".repeat(1001) })).description,
    ).toBeDefined();
  });

  it("rejects an invalid frequency", () => {
    expect(validateHabitInput(input({ frequency: "monthly" })).frequency).toBeDefined();
  });

  it("rejects a target per period outside 1-100", () => {
    expect(validateHabitInput(input({ targetPerPeriod: "0" })).targetPerPeriod).toBeDefined();
    expect(validateHabitInput(input({ targetPerPeriod: "101" })).targetPerPeriod).toBeDefined();
    expect(validateHabitInput(input({ targetPerPeriod: "1.5" })).targetPerPeriod).toBeDefined();
  });

  it("accepts a target per period at the bounds", () => {
    expect(validateHabitInput(input({ targetPerPeriod: "1" })).targetPerPeriod).toBeUndefined();
    expect(validateHabitInput(input({ targetPerPeriod: "100" })).targetPerPeriod).toBeUndefined();
  });
});

describe("hasHabitErrors", () => {
  it("is false for an empty error set", () => {
    expect(hasHabitErrors({})).toBe(false);
  });

  it("is true when any field has an error", () => {
    expect(hasHabitErrors({ name: "bad" })).toBe(true);
  });
});

describe("check-in normalization and validation", () => {
  it("defaults a blank value to 1", () => {
    expect(normalizeCheckinInput({ value: "", note: "" })).toEqual({ value: 1, note: null });
  });

  it("normalizes a numeric value and trims/nulls a blank note", () => {
    expect(normalizeCheckinInput({ value: "3", note: "  Felt good  " })).toEqual({
      value: 3,
      note: "Felt good",
    });
    expect(normalizeCheckinInput({ value: "3", note: "   " }).note).toBeNull();
  });

  it("carries a non-numeric value through as NaN for validation to reject", () => {
    expect(Number.isNaN(normalizeCheckinInput({ value: "abc" }).value)).toBe(true);
  });

  it("rejects a value outside 1-1000", () => {
    expect(validateCheckinInput({ value: 0, note: null })).toBeDefined();
    expect(validateCheckinInput({ value: 1001, note: null })).toBeDefined();
    expect(validateCheckinInput({ value: 1.5, note: null })).toBeDefined();
  });

  it("accepts a value at the bounds", () => {
    expect(validateCheckinInput({ value: 1, note: null })).toBeUndefined();
    expect(validateCheckinInput({ value: 1000, note: null })).toBeUndefined();
  });

  it("rejects a note over 500 characters", () => {
    expect(validateCheckinInput({ value: 1, note: "a".repeat(501) })).toBeDefined();
  });
});

describe("parseHabitId", () => {
  it("parses a valid numeric string or number", () => {
    expect(parseHabitId("7")).toBe(7);
    expect(parseHabitId(7)).toBe(7);
  });

  it("rejects non-numeric, zero, negative and decimal values", () => {
    for (const bad of ["abc", "0", "-1", "1.5", "", null, undefined]) {
      expect(parseHabitId(bad)).toBeNull();
    }
  });
});

describe("parseCheckinDate", () => {
  it("parses a valid date", () => {
    expect(parseCheckinDate("2026-09-12")).toBe("2026-09-12");
  });

  it("returns null for anything invalid or absent", () => {
    for (const bad of ["", "not-a-date", "2026-13-40", undefined, null]) {
      expect(parseCheckinDate(bad)).toBeNull();
    }
  });
});
