import { describe, expect, it } from "vitest";
import {
  RESERVED_COMMUNITY_SLUGS,
  hasCommunityErrors,
  normalizeCommunitySlug,
  validateCommunityInput,
  type CommunityInput,
} from "./community-validation";

function input(overrides: Partial<CommunityInput> = {}): CommunityInput {
  return {
    name: "Software Builders",
    slug: "software-builders",
    description: "",
    rules: "",
    ...overrides,
  };
}

describe("normalizeCommunitySlug", () => {
  it("lowercases and trims", () => {
    expect(normalizeCommunitySlug("  Software Builders  ")).toBe(
      "software-builders",
    );
  });

  it("collapses whitespace and underscores to single hyphens", () => {
    expect(normalizeCommunitySlug("software_builders  club")).toBe(
      "software-builders-club",
    );
  });

  it("strips characters outside [a-z0-9-]", () => {
    expect(normalizeCommunitySlug("Software!! Builders??")).toBe(
      "software-builders",
    );
  });

  it("collapses repeated hyphens and trims leading/trailing ones", () => {
    expect(normalizeCommunitySlug("--software--builders--")).toBe(
      "software-builders",
    );
  });
});

describe("validateCommunityInput", () => {
  it("accepts a valid minimal input", () => {
    expect(validateCommunityInput(input())).toEqual({});
  });

  it("rejects a name shorter than 2 characters", () => {
    expect(validateCommunityInput(input({ name: "A" })).name).toBeDefined();
  });

  it("rejects a name longer than 80 characters", () => {
    expect(
      validateCommunityInput(input({ name: "A".repeat(81) })).name,
    ).toBeDefined();
  });

  it("rejects a slug shorter than 3 characters", () => {
    expect(validateCommunityInput(input({ slug: "ab" })).slug).toBeDefined();
  });

  it("rejects a slug longer than 60 characters", () => {
    expect(
      validateCommunityInput(input({ slug: "a".repeat(61) })).slug,
    ).toBeDefined();
  });

  it("normalizes messy-but-salvageable input to a valid slug (validation runs after normalization)", () => {
    for (const messy of ["-leading", "trailing-", "double--hyphen", "Upper Case"]) {
      expect(validateCommunityInput(input({ slug: messy })).slug).toBeUndefined();
    }
  });

  it("accepts a well-formed multi-segment slug", () => {
    expect(validateCommunityInput(input({ slug: "a-b-c" })).slug).toBeUndefined();
  });

  it("rejects input that normalizes away to nothing usable", () => {
    expect(validateCommunityInput(input({ slug: "!!!" })).slug).toBeDefined();
    expect(validateCommunityInput(input({ slug: "--" })).slug).toBeDefined();
  });

  it("rejects a reserved slug", () => {
    for (const slug of RESERVED_COMMUNITY_SLUGS) {
      expect(validateCommunityInput(input({ slug })).slug).toBeDefined();
    }
  });

  it("rejects a description over 2000 characters", () => {
    expect(
      validateCommunityInput(input({ description: "a".repeat(2001) }))
        .description,
    ).toBeDefined();
  });

  it("accepts a description at exactly 2000 characters", () => {
    expect(
      validateCommunityInput(input({ description: "a".repeat(2000) }))
        .description,
    ).toBeUndefined();
  });

  it("rejects rules over 5000 characters", () => {
    expect(
      validateCommunityInput(input({ rules: "a".repeat(5001) })).rules,
    ).toBeDefined();
  });

  it("accepts rules at exactly 5000 characters", () => {
    expect(
      validateCommunityInput(input({ rules: "a".repeat(5000) })).rules,
    ).toBeUndefined();
  });
});

describe("hasCommunityErrors", () => {
  it("is false for an empty error set", () => {
    expect(hasCommunityErrors({})).toBe(false);
  });

  it("is true when any field has an error", () => {
    expect(hasCommunityErrors({ name: "bad" })).toBe(true);
  });
});
