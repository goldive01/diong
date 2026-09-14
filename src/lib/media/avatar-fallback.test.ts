import { describe, expect, it } from "vitest";
import { getInitials } from "./avatar-fallback";

describe("getInitials", () => {
  it("returns the uppercased first character of a normal name", () => {
    expect(getInitials("Imoh")).toBe("I");
  });

  it("trims leading whitespace before taking the first character", () => {
    expect(getInitials("   Imoh")).toBe("I");
  });

  it("returns '?' for an empty string", () => {
    expect(getInitials("")).toBe("?");
  });

  it("returns '?' for whitespace-only input", () => {
    expect(getInitials("   ")).toBe("?");
  });

  it("returns '?' for null", () => {
    expect(getInitials(null)).toBe("?");
  });

  it("returns '?' for undefined", () => {
    expect(getInitials(undefined)).toBe("?");
  });

  it("handles a single-character name", () => {
    expect(getInitials("x")).toBe("X");
  });

  it("uppercases a name starting with a lowercase letter", () => {
    expect(getInitials("imoh")).toBe("I");
  });
});
