import { describe, expect, it } from "vitest";
import { sharedInterestLabel } from "./discover-labels";

describe("sharedInterestLabel", () => {
  it("is blank for no overlap", () => {
    expect(sharedInterestLabel(0)).toBe("");
    expect(sharedInterestLabel(null)).toBe("");
    expect(sharedInterestLabel(undefined)).toBe("");
    expect(sharedInterestLabel(-1)).toBe("");
  });

  it("uses the singular for exactly one", () => {
    expect(sharedInterestLabel(1)).toBe("1 shared interest");
  });

  it("uses the plural for more than one", () => {
    expect(sharedInterestLabel(3)).toBe("3 shared interests");
  });

  it("floors a fractional count", () => {
    expect(sharedInterestLabel(2.9)).toBe("2 shared interests");
  });
});
