import { describe, expect, it } from "vitest";
import {
  describeFollowRelationship,
  followerLabel,
  followingLabel,
  formatCount,
  truncateBio,
} from "./social-labels";

describe("formatCount", () => {
  it("shows small counts as-is", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(42)).toBe("42");
    expect(formatCount(999)).toBe("999");
  });

  it("abbreviates thousands and millions", () => {
    expect(formatCount(1_000)).toBe("1k");
    expect(formatCount(1_500)).toBe("1.5k");
    expect(formatCount(12_000)).toBe("12k");
    expect(formatCount(1_500_000)).toBe("1.5m");
  });

  it("treats negatives, NaN and nullish as 0", () => {
    expect(formatCount(-5)).toBe("0");
    expect(formatCount(Number.NaN)).toBe("0");
    expect(formatCount(null)).toBe("0");
    expect(formatCount(undefined)).toBe("0");
  });
});

describe("followerLabel / followingLabel", () => {
  it("uses the singular only for exactly one follower", () => {
    expect(followerLabel(1)).toBe("1 follower");
    expect(followerLabel(0)).toBe("0 followers");
    expect(followerLabel(2)).toBe("2 followers");
    expect(followerLabel(null)).toBe("0 followers");
  });

  it("always reads 'N following'", () => {
    expect(followingLabel(0)).toBe("0 following");
    expect(followingLabel(5)).toBe("5 following");
    expect(followingLabel(2_400)).toBe("2.4k following");
  });
});

describe("describeFollowRelationship", () => {
  it("lets a viewer-side block outrank every other state", () => {
    expect(
      describeFollowRelationship({
        isSelf: true,
        viewerFollows: true,
        viewerBlocked: true,
      }),
    ).toBe("blocked");
  });

  it("identifies self, following and not-following", () => {
    expect(
      describeFollowRelationship({
        isSelf: true,
        viewerFollows: false,
        viewerBlocked: false,
      }),
    ).toBe("self");
    expect(
      describeFollowRelationship({
        isSelf: false,
        viewerFollows: true,
        viewerBlocked: false,
      }),
    ).toBe("following");
    expect(
      describeFollowRelationship({
        isSelf: false,
        viewerFollows: false,
        viewerBlocked: false,
      }),
    ).toBe("not_following");
  });
});

describe("truncateBio", () => {
  it("returns a short bio unchanged", () => {
    expect(truncateBio("  Building steady habits.  ")).toBe(
      "Building steady habits.",
    );
  });

  it("truncates a long bio on a character boundary with an ellipsis", () => {
    const long = "x".repeat(200);
    const out = truncateBio(long, 20);
    expect(out).toHaveLength(20);
    expect(out.endsWith("…")).toBe(true);
  });

  it("returns an empty string for missing or blank input", () => {
    expect(truncateBio(null)).toBe("");
    expect(truncateBio(undefined)).toBe("");
    expect(truncateBio("   ")).toBe("");
  });
});
