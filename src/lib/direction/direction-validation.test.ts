import { describe, expect, it } from "vitest";
import {
  DESIRED_IDENTITY_MAX,
  INTENTION_MAX,
  PRIMARY_ACTION_MAX,
  WHY_IT_MATTERS_MAX,
  directionColumns,
  hasDirectionErrors,
  isDirectionEditableToday,
  normalizeDirectionInput,
  parseDirectionId,
  parseOptionalLinkId,
  validateDirectionInput,
  type DirectionInput,
} from "./direction-validation";

function input(overrides: Partial<DirectionInput> = {}): DirectionInput {
  return {
    intention: "",
    desiredIdentity: "",
    primaryAction: "Write the first chapter",
    whyItMatters: "",
    ...overrides,
  };
}

describe("normalizeDirectionInput", () => {
  it("trims every field", () => {
    expect(
      normalizeDirectionInput({
        intention: "  Stay focused  ",
        desiredIdentity: "  A finisher  ",
        primaryAction: "  Write  ",
        whyItMatters: "  It compounds  ",
      }),
    ).toEqual({
      intention: "Stay focused",
      desiredIdentity: "A finisher",
      primaryAction: "Write",
      whyItMatters: "It compounds",
    });
  });

  it("defaults absent fields to empty strings", () => {
    expect(normalizeDirectionInput({})).toEqual({
      intention: "",
      desiredIdentity: "",
      primaryAction: "",
      whyItMatters: "",
    });
  });
});

describe("validateDirectionInput", () => {
  it("accepts a minimal valid input — primary action only", () => {
    expect(validateDirectionInput(input())).toEqual({});
  });

  it("rejects an empty primary action", () => {
    expect(validateDirectionInput(input({ primaryAction: "" })).primaryAction).toBeDefined();
  });

  it(`rejects a primary action longer than ${PRIMARY_ACTION_MAX} characters`, () => {
    expect(
      validateDirectionInput(input({ primaryAction: "a".repeat(PRIMARY_ACTION_MAX + 1) }))
        .primaryAction,
    ).toBeDefined();
  });

  it(`accepts a primary action at exactly ${PRIMARY_ACTION_MAX} characters`, () => {
    expect(
      validateDirectionInput(input({ primaryAction: "a".repeat(PRIMARY_ACTION_MAX) }))
        .primaryAction,
    ).toBeUndefined();
  });

  it("accepts empty optional fields", () => {
    expect(
      validateDirectionInput(
        input({ intention: "", desiredIdentity: "", whyItMatters: "" }),
      ),
    ).toEqual({});
  });

  it(`rejects intention longer than ${INTENTION_MAX} characters`, () => {
    expect(
      validateDirectionInput(input({ intention: "a".repeat(INTENTION_MAX + 1) })).intention,
    ).toBeDefined();
  });

  it(`rejects desired identity longer than ${DESIRED_IDENTITY_MAX} characters`, () => {
    expect(
      validateDirectionInput(input({ desiredIdentity: "a".repeat(DESIRED_IDENTITY_MAX + 1) }))
        .desiredIdentity,
    ).toBeDefined();
  });

  it(`rejects why-it-matters longer than ${WHY_IT_MATTERS_MAX} characters`, () => {
    expect(
      validateDirectionInput(input({ whyItMatters: "a".repeat(WHY_IT_MATTERS_MAX + 1) }))
        .whyItMatters,
    ).toBeDefined();
  });
});

describe("hasDirectionErrors", () => {
  it("is false for an empty error set", () => {
    expect(hasDirectionErrors({})).toBe(false);
  });

  it("is true when any field has an error", () => {
    expect(hasDirectionErrors({ primaryAction: "bad" })).toBe(true);
  });
});

describe("directionColumns", () => {
  it("maps optional blank fields to null", () => {
    expect(directionColumns(input())).toEqual({
      intention: null,
      desired_identity: null,
      primary_action: "Write the first chapter",
      why_it_matters: null,
    });
  });

  it("trims and preserves non-blank optional fields", () => {
    expect(
      directionColumns(
        input({ intention: "Stay focused", desiredIdentity: "A finisher" }),
      ),
    ).toEqual({
      intention: "Stay focused",
      desired_identity: "A finisher",
      primary_action: "Write the first chapter",
      why_it_matters: null,
    });
  });
});

describe("parseOptionalLinkId", () => {
  it("treats an empty string as no link", () => {
    expect(parseOptionalLinkId("")).toBeNull();
  });

  it("parses a valid numeric string", () => {
    expect(parseOptionalLinkId("42")).toBe(42);
  });

  it("parses a number", () => {
    expect(parseOptionalLinkId(42)).toBe(42);
  });

  it("rejects non-numeric, zero, negative and decimal values", () => {
    for (const bad of ["abc", "0", "-1", "1.5", null, undefined, {}]) {
      expect(parseOptionalLinkId(bad)).toBeNull();
    }
  });
});

describe("parseDirectionId", () => {
  it("parses a valid numeric string", () => {
    expect(parseDirectionId("42")).toBe(42);
  });

  it("parses a number", () => {
    expect(parseDirectionId(42)).toBe(42);
  });

  it("rejects non-numeric, zero, negative and decimal values", () => {
    for (const bad of ["abc", "0", "-1", "1.5", "", null, undefined, {}]) {
      expect(parseDirectionId(bad)).toBeNull();
    }
  });
});

describe("isDirectionEditableToday", () => {
  it("is editable when direction_date matches today", () => {
    expect(isDirectionEditableToday("2026-09-20", "2026-09-20")).toBe(true);
  });

  it("is not editable when direction_date is before today", () => {
    expect(isDirectionEditableToday("2026-09-19", "2026-09-20")).toBe(false);
  });

  it("is not editable when direction_date is after today", () => {
    expect(isDirectionEditableToday("2026-09-21", "2026-09-20")).toBe(false);
  });
});
