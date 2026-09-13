import { describe, expect, it } from "vitest";
import {
  hasJournalErrors,
  journalColumns,
  normalizeJournalInput,
  parseEntryDate,
  parseJournalId,
  parseLinkedId,
  validateJournalInput,
  type JournalInput,
} from "./journal-validation";

function input(overrides: Partial<JournalInput> = {}): JournalInput {
  return {
    title: "",
    body: "Today I made progress.",
    mood: "",
    entryDate: "2026-09-12",
    goalId: "",
    habitId: "",
    primeAssignmentId: "",
    ...overrides,
  };
}

describe("normalizeJournalInput", () => {
  it("trims fields and defaults a blank entryDate to today", () => {
    const normalized = normalizeJournalInput({ title: "  Building Diong  ", body: "  Hi  " });
    expect(normalized.title).toBe("Building Diong");
    expect(normalized.body).toBe("Hi");
    expect(normalized.entryDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("keeps a provided entryDate", () => {
    expect(normalizeJournalInput({ entryDate: "2026-01-01" }).entryDate).toBe("2026-01-01");
  });
});

describe("validateJournalInput", () => {
  it("accepts a minimal valid input", () => {
    expect(validateJournalInput(input())).toEqual({});
  });

  it("rejects an empty body", () => {
    expect(validateJournalInput(input({ body: "" })).body).toBeDefined();
  });

  it("rejects a body over 10000 characters", () => {
    expect(validateJournalInput(input({ body: "a".repeat(10001) })).body).toBeDefined();
  });

  it("accepts a body at exactly 10000 characters", () => {
    expect(validateJournalInput(input({ body: "a".repeat(10000) })).body).toBeUndefined();
  });

  it("rejects a title over 200 characters", () => {
    expect(validateJournalInput(input({ title: "a".repeat(201) })).title).toBeDefined();
  });

  it("accepts a blank title", () => {
    expect(validateJournalInput(input({ title: "" })).title).toBeUndefined();
  });

  it("rejects an unknown mood", () => {
    expect(validateJournalInput(input({ mood: "ecstatic" })).mood).toBeDefined();
  });

  it("accepts a blank mood", () => {
    expect(validateJournalInput(input({ mood: "" })).mood).toBeUndefined();
  });

  it("rejects an invalid entry date", () => {
    expect(validateJournalInput(input({ entryDate: "not-a-date" })).entryDate).toBeDefined();
  });

  it("rejects a non-numeric linked goal/habit/prime id", () => {
    expect(validateJournalInput(input({ goalId: "abc" })).goalId).toBeDefined();
    expect(validateJournalInput(input({ habitId: "abc" })).habitId).toBeDefined();
    expect(
      validateJournalInput(input({ primeAssignmentId: "abc" })).primeAssignmentId,
    ).toBeDefined();
  });

  it("accepts a blank linked id", () => {
    expect(validateJournalInput(input({ goalId: "" })).goalId).toBeUndefined();
  });

  it("accepts a valid linked id", () => {
    expect(validateJournalInput(input({ goalId: "5" })).goalId).toBeUndefined();
  });
});

describe("hasJournalErrors", () => {
  it("is false for an empty error set", () => {
    expect(hasJournalErrors({})).toBe(false);
  });

  it("is true when any field has an error", () => {
    expect(hasJournalErrors({ body: "bad" })).toBe(true);
  });
});

describe("journalColumns", () => {
  it("maps blank optional fields to null", () => {
    expect(journalColumns(input())).toEqual({
      title: null,
      body: "Today I made progress.",
      mood: null,
      entry_date: "2026-09-12",
      goal_id: null,
      habit_id: null,
      prime_assignment_id: null,
    });
  });

  it("maps provided fields through", () => {
    expect(
      journalColumns(
        input({ title: "Reflection", mood: "focused", goalId: "3", habitId: "7" }),
      ),
    ).toMatchObject({
      title: "Reflection",
      mood: "focused",
      goal_id: 3,
      habit_id: 7,
    });
  });
});

describe("parseJournalId / parseLinkedId", () => {
  it("parses a valid numeric string or number", () => {
    expect(parseJournalId("9")).toBe(9);
    expect(parseJournalId(9)).toBe(9);
    expect(parseLinkedId("9")).toBe(9);
  });

  it("rejects non-numeric, zero, negative and decimal values", () => {
    for (const bad of ["abc", "0", "-1", "1.5", "", null, undefined]) {
      expect(parseJournalId(bad)).toBeNull();
      expect(parseLinkedId(bad)).toBeNull();
    }
  });
});

describe("parseEntryDate", () => {
  it("parses a valid date", () => {
    expect(parseEntryDate("2026-09-12")).toBe("2026-09-12");
  });

  it("returns null for anything invalid or absent", () => {
    for (const bad of ["", "not-a-date", "2026-13-40", undefined, null]) {
      expect(parseEntryDate(bad)).toBeNull();
    }
  });
});
