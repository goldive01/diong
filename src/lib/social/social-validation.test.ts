import { describe, expect, it } from "vitest";
import {
  FOLLOW_LIST_MAX_PAGE,
  FOLLOW_LIST_PAGE_SIZE,
  checkSocialTarget,
  getPagination,
  isUuid,
  isValidUsername,
  parseFollowListPage,
} from "./social-validation";

const VIEWER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

describe("isUuid", () => {
  it("accepts a canonical UUID in either case", () => {
    expect(isUuid(VIEWER)).toBe(true);
    expect(isUuid(VIEWER.toUpperCase())).toBe(true);
  });

  it("rejects malformed or non-string values", () => {
    for (const value of [
      "",
      "not-a-uuid",
      "11111111-1111-4111-8111-11111111111", // 1 char short
      "11111111111141118111111111111111", // no dashes
      `${VIEWER} `,
      undefined,
      null,
      42,
      {},
    ]) {
      expect(isUuid(value)).toBe(false);
    }
  });
});

describe("isValidUsername", () => {
  it("accepts a normalized 3–30 char handle", () => {
    expect(isValidUsername("imoh_01")).toBe(true);
    expect(isValidUsername("  IMOH_01 ")).toBe(true);
  });

  it("rejects the wrong length, punctuation and non-strings", () => {
    for (const value of ["ab", "a".repeat(31), "im oh", "im-oh", "imöh", 5, null]) {
      expect(isValidUsername(value)).toBe(false);
    }
  });
});

describe("checkSocialTarget", () => {
  it("returns null for a valid, different target", () => {
    expect(checkSocialTarget(VIEWER, OTHER)).toBeNull();
  });

  it("rejects a self-target (self-follow / self-block)", () => {
    expect(checkSocialTarget(VIEWER, VIEWER)).toBe("self");
  });

  it("rejects an invalid target id", () => {
    for (const value of ["", "nope", undefined, null, 1, VIEWER.slice(1)]) {
      expect(checkSocialTarget(VIEWER, value)).toBe("invalid");
    }
  });

  it("rejects when the acting user id is itself not a UUID", () => {
    expect(checkSocialTarget("me", OTHER)).toBe("invalid");
  });
});

describe("parseFollowListPage", () => {
  it("defaults anything invalid to page 1", () => {
    for (const value of [
      undefined,
      null,
      "",
      "  ",
      "0",
      "-3",
      "abc",
      "2.5",
      "1e2",
      Number.NaN,
      {},
      -1,
    ]) {
      expect(parseFollowListPage(value)).toBe(1);
    }
  });

  it("accepts a positive integer as a string or number", () => {
    expect(parseFollowListPage("1")).toBe(1);
    expect(parseFollowListPage("7")).toBe(7);
    expect(parseFollowListPage(4)).toBe(4);
  });

  it("reads the first entry of a repeated query param", () => {
    expect(parseFollowListPage(["3", "9"])).toBe(3);
  });

  it("clamps values above the ceiling", () => {
    expect(parseFollowListPage("999999")).toBe(FOLLOW_LIST_MAX_PAGE);
  });
});

describe("getPagination", () => {
  it("maps page 1 to the first window", () => {
    expect(getPagination(1)).toEqual({
      page: 1,
      pageSize: FOLLOW_LIST_PAGE_SIZE,
      from: 0,
      to: FOLLOW_LIST_PAGE_SIZE - 1,
    });
  });

  it("offsets deeper pages by page size", () => {
    const third = getPagination(3);
    expect(third.from).toBe(FOLLOW_LIST_PAGE_SIZE * 2);
    expect(third.to).toBe(FOLLOW_LIST_PAGE_SIZE * 3 - 1);
  });

  it("falls back to page 1 for a non-positive or non-integer page", () => {
    for (const value of [0, -2, 1.5, Number.NaN]) {
      expect(getPagination(value).page).toBe(1);
    }
  });

  it("clamps an over-ceiling page", () => {
    expect(getPagination(10_000).page).toBe(FOLLOW_LIST_MAX_PAGE);
  });
});
