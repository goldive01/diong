import { describe, expect, it } from "vitest";
import {
  POST_TYPES,
  POST_VISIBILITIES,
  isPostType,
  isPostVisibility,
} from "./post-vocab";

describe("post vocab", () => {
  it("exposes the seven Diong post types", () => {
    expect([...POST_TYPES]).toEqual([
      "update",
      "reflection",
      "progress",
      "learning",
      "achievement",
      "question",
      "resource",
    ]);
  });

  it("exposes the three visibilities", () => {
    expect([...POST_VISIBILITIES]).toEqual(["public", "followers", "private"]);
  });

  it("isPostType accepts only known types", () => {
    for (const type of POST_TYPES) expect(isPostType(type)).toBe(true);
    for (const value of ["", "UPDATE", "rant", "note", 3, null, undefined, {}]) {
      expect(isPostType(value)).toBe(false);
    }
  });

  it("isPostVisibility accepts only known visibilities", () => {
    for (const v of POST_VISIBILITIES) expect(isPostVisibility(v)).toBe(true);
    for (const value of ["", "Public", "friends", "everyone", 1, null]) {
      expect(isPostVisibility(value)).toBe(false);
    }
  });
});
