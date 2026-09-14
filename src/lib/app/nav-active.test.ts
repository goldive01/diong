import { describe, expect, it } from "vitest";
import { isNavLinkActive } from "./nav-active";

describe("isNavLinkActive", () => {
  it("matches the exact path", () => {
    expect(isNavLinkActive("/feed", "/feed")).toBe(true);
  });

  it("matches a nested path", () => {
    expect(isNavLinkActive("/messages/42", "/messages")).toBe(true);
  });

  it("does not match an unrelated path with a shared prefix", () => {
    expect(isNavLinkActive("/discover-archive", "/discover")).toBe(false);
  });

  it("does not match a different top-level path", () => {
    expect(isNavLinkActive("/goals", "/habits")).toBe(false);
  });

  it("returns false for a null pathname", () => {
    expect(isNavLinkActive(null, "/feed")).toBe(false);
  });
});
