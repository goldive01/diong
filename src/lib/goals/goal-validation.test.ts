import { describe, expect, it } from "vitest";
import {
  hasGoalErrors,
  normalizeGoalInput,
  parseGoalId,
  parseProgressPercent,
  progressFromMilestones,
  validateGoalInput,
  validateMilestoneTitle,
  validateProgressPercent,
  type GoalInput,
} from "./goal-validation";

function input(overrides: Partial<GoalInput> = {}): GoalInput {
  return {
    title: "Launch Diong V1",
    description: "",
    category: "",
    targetDate: "",
    ...overrides,
  };
}

describe("normalizeGoalInput", () => {
  it("trims every field", () => {
    expect(
      normalizeGoalInput({
        title: "  Launch  ",
        description: "  Ship it  ",
        category: "  Career  ",
        targetDate: "  2026-12-01  ",
      }),
    ).toEqual({
      title: "Launch",
      description: "Ship it",
      category: "Career",
      targetDate: "2026-12-01",
    });
  });

  it("defaults absent fields to empty strings", () => {
    expect(normalizeGoalInput({})).toEqual({
      title: "",
      description: "",
      category: "",
      targetDate: "",
    });
  });
});

describe("validateGoalInput", () => {
  it("accepts a minimal valid input", () => {
    expect(validateGoalInput(input())).toEqual({});
  });

  it("rejects an empty title", () => {
    expect(validateGoalInput(input({ title: "" })).title).toBeDefined();
  });

  it("rejects a title longer than 120 characters", () => {
    expect(validateGoalInput(input({ title: "a".repeat(121) })).title).toBeDefined();
  });

  it("accepts a title at exactly 120 characters", () => {
    expect(validateGoalInput(input({ title: "a".repeat(120) })).title).toBeUndefined();
  });

  it("rejects a description over 3000 characters", () => {
    expect(
      validateGoalInput(input({ description: "a".repeat(3001) })).description,
    ).toBeDefined();
  });

  it("rejects a category over 60 characters", () => {
    expect(validateGoalInput(input({ category: "a".repeat(61) })).category).toBeDefined();
  });

  it("rejects an invalid target date", () => {
    expect(validateGoalInput(input({ targetDate: "not-a-date" })).targetDate).toBeDefined();
    expect(validateGoalInput(input({ targetDate: "2026-13-40" })).targetDate).toBeDefined();
  });

  it("accepts a valid target date", () => {
    expect(validateGoalInput(input({ targetDate: "2026-12-01" })).targetDate).toBeUndefined();
  });

  it("accepts an absent target date", () => {
    expect(validateGoalInput(input({ targetDate: "" })).targetDate).toBeUndefined();
  });
});

describe("hasGoalErrors", () => {
  it("is false for an empty error set", () => {
    expect(hasGoalErrors({})).toBe(false);
  });

  it("is true when any field has an error", () => {
    expect(hasGoalErrors({ title: "bad" })).toBe(true);
  });
});

describe("progress percent", () => {
  it("parses a plain integer string", () => {
    expect(parseProgressPercent("42")).toBe(42);
  });

  it("parses a number", () => {
    expect(parseProgressPercent(42)).toBe(42);
  });

  it("is NaN for anything non-numeric", () => {
    expect(Number.isNaN(parseProgressPercent("abc"))).toBe(true);
    expect(Number.isNaN(parseProgressPercent(""))).toBe(true);
    expect(Number.isNaN(parseProgressPercent(undefined))).toBe(true);
    expect(Number.isNaN(parseProgressPercent("-1"))).toBe(true);
  });

  it("validates the 0-100 range", () => {
    expect(validateProgressPercent(0)).toBeUndefined();
    expect(validateProgressPercent(100)).toBeUndefined();
    expect(validateProgressPercent(50)).toBeUndefined();
    expect(validateProgressPercent(-1)).toBeDefined();
    expect(validateProgressPercent(101)).toBeDefined();
    expect(validateProgressPercent(1.5)).toBeDefined();
    expect(validateProgressPercent(Number.NaN)).toBeDefined();
  });
});

describe("validateMilestoneTitle", () => {
  it("rejects an empty title", () => {
    expect(validateMilestoneTitle("")).toBeDefined();
  });

  it("rejects a title longer than 200 characters", () => {
    expect(validateMilestoneTitle("a".repeat(201))).toBeDefined();
  });

  it("accepts a title at exactly 200 characters", () => {
    expect(validateMilestoneTitle("a".repeat(200))).toBeUndefined();
  });

  it("accepts a normal title", () => {
    expect(validateMilestoneTitle("Finish the draft")).toBeUndefined();
  });
});

describe("progressFromMilestones", () => {
  it("is 0 with no milestones", () => {
    expect(progressFromMilestones([])).toBe(0);
  });

  it("computes a rounded percentage", () => {
    expect(
      progressFromMilestones([
        { is_completed: true },
        { is_completed: true },
        { is_completed: false },
      ]),
    ).toBe(67);
  });

  it("is 100 when every milestone is complete", () => {
    expect(
      progressFromMilestones([{ is_completed: true }, { is_completed: true }]),
    ).toBe(100);
  });

  it("is 0 when none are complete", () => {
    expect(
      progressFromMilestones([{ is_completed: false }, { is_completed: false }]),
    ).toBe(0);
  });
});

describe("parseGoalId", () => {
  it("parses a valid numeric string", () => {
    expect(parseGoalId("42")).toBe(42);
  });

  it("parses a number", () => {
    expect(parseGoalId(42)).toBe(42);
  });

  it("rejects non-numeric, zero, negative and decimal values", () => {
    for (const bad of ["abc", "0", "-1", "1.5", "", null, undefined, {}]) {
      expect(parseGoalId(bad)).toBeNull();
    }
  });
});
