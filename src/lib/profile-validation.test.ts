import { describe, expect, it } from "vitest";
import {
  RESERVED_USERNAMES,
  hasValidationErrors,
  normalizeUsername,
  validateOnboarding,
  validateProfile,
} from "./profile-validation";

const validProfile = {
  username: "imoh_01",
  displayName: "Imoh",
  bio: "",
};

describe("normalizeUsername", () => {
  it("trims and lowercases", () => {
    expect(normalizeUsername("  ImOh_01 ")).toBe("imoh_01");
    expect(normalizeUsername("USER")).toBe("user");
  });
});

describe("validateProfile", () => {
  it("accepts a well-formed profile", () => {
    expect(validateProfile(validProfile)).toEqual({});
  });

  it("rejects a username shorter than 3 or longer than 30", () => {
    expect(validateProfile({ ...validProfile, username: "ab" }).username).toBeTruthy();
    expect(
      validateProfile({ ...validProfile, username: "a".repeat(31) }).username,
    ).toBeTruthy();
  });

  it("normalizes case and surrounding whitespace before validating", () => {
    // normalizeUsername lowercases and trims, so these are accepted.
    for (const username of ["Imoh_01", "  imoh_01  ", "IMOH_01"]) {
      expect(
        validateProfile({ ...validProfile, username }).username,
        username,
      ).toBeUndefined();
    }
  });

  it("rejects internal spaces and punctuation that survive normalization", () => {
    for (const username of ["im oh", "im-oh", "imoh!", "imoh.01", "imöh"]) {
      expect(
        validateProfile({ ...validProfile, username }).username,
        username,
      ).toBeTruthy();
    }
  });

  it("rejects every reserved username", () => {
    for (const username of RESERVED_USERNAMES) {
      const errors = validateProfile({ ...validProfile, username });
      expect(errors.username, username).toBeTruthy();
    }
  });

  it("requires a display name of 1–60 characters", () => {
    expect(validateProfile({ ...validProfile, displayName: "" }).displayName).toBeTruthy();
    expect(
      validateProfile({ ...validProfile, displayName: "x".repeat(61) }).displayName,
    ).toBeTruthy();
    expect(
      validateProfile({ ...validProfile, displayName: "   " }).displayName,
    ).toBeTruthy();
  });

  it("rejects a bio longer than 300 characters", () => {
    expect(validateProfile({ ...validProfile, bio: "x".repeat(301) }).bio).toBeTruthy();
    expect(validateProfile({ ...validProfile, bio: "x".repeat(300) }).bio).toBeUndefined();
  });
});

describe("validateOnboarding", () => {
  const base = { ...validProfile, interestIds: [1, 2, 3] };

  it("accepts 1–5 valid interests", () => {
    expect(validateOnboarding({ ...base, interestIds: [7] })).toEqual({});
    expect(validateOnboarding({ ...base, interestIds: [1, 2, 3, 4, 5] })).toEqual({});
  });

  it("rejects zero or more than five interests", () => {
    expect(validateOnboarding({ ...base, interestIds: [] }).interestIds).toBeTruthy();
    expect(
      validateOnboarding({ ...base, interestIds: [1, 2, 3, 4, 5, 6] }).interestIds,
    ).toBeTruthy();
  });

  it("rejects non-positive or non-integer interest ids", () => {
    expect(validateOnboarding({ ...base, interestIds: [0] }).interestIds).toBeTruthy();
    expect(validateOnboarding({ ...base, interestIds: [-1] }).interestIds).toBeTruthy();
    expect(validateOnboarding({ ...base, interestIds: [1.5] }).interestIds).toBeTruthy();
  });

  it("still surfaces profile errors alongside interest checks", () => {
    const errors = validateOnboarding({ ...base, username: "ab" });
    expect(errors.username).toBeTruthy();
  });

  it("counts duplicate interests as their unique set", () => {
    // Six ids but only five unique -> valid on count.
    expect(
      validateOnboarding({ ...base, interestIds: [1, 1, 2, 3, 4, 5] }).interestIds,
    ).toBeUndefined();
  });
});

describe("hasValidationErrors", () => {
  it("is false for an empty error map and true otherwise", () => {
    expect(hasValidationErrors({})).toBe(false);
    expect(hasValidationErrors({ username: "bad" })).toBe(true);
  });
});
