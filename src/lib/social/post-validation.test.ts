import { describe, expect, it } from "vitest";
import {
  COMMENT_BODY_MAX,
  FEED_MAX_LIMIT,
  FEED_PAGE_SIZE,
  POST_BODY_MAX,
  clampLimit,
  encodeFeedCursor,
  hasErrors,
  normalizePostBody,
  parseCommentParentId,
  parseFeedCursor,
  validateCommentInput,
  validatePostInput,
} from "./post-validation";

describe("normalizePostBody", () => {
  it("trims outer whitespace and normalises newlines", () => {
    expect(normalizePostBody("  hello\r\nworld  ")).toBe("hello\nworld");
    expect(normalizePostBody("a\rb")).toBe("a\nb");
  });

  it("collapses 3+ blank lines to a single blank line", () => {
    expect(normalizePostBody("a\n\n\n\n\nb")).toBe("a\n\nb");
  });

  it("strips control characters but keeps tab and newline", () => {
    const raw = "a" + String.fromCharCode(1) + "b\tc\nd" + String.fromCharCode(127);
    expect(normalizePostBody(raw)).toBe("ab\tc\nd");
  });

  it("returns an empty string for non-strings", () => {
    for (const value of [null, undefined, 5, {}, []]) {
      expect(normalizePostBody(value)).toBe("");
    }
  });
});

describe("validatePostInput", () => {
  const ok = { postType: "reflection", body: "A useful thought.", visibility: "public" };

  it("accepts a well-formed post", () => {
    expect(hasErrors(validatePostInput(ok))).toBe(false);
  });

  it("rejects an empty or whitespace-only body", () => {
    expect(validatePostInput({ ...ok, body: "   \n  " }).body).toBeDefined();
    expect(validatePostInput({ ...ok, body: "" }).body).toBeDefined();
  });

  it("rejects a body over the maximum", () => {
    expect(
      validatePostInput({ ...ok, body: "x".repeat(POST_BODY_MAX + 1) }).body,
    ).toBeDefined();
    expect(
      validatePostInput({ ...ok, body: "x".repeat(POST_BODY_MAX) }).body,
    ).toBeUndefined();
  });

  it("rejects an unknown post type", () => {
    expect(validatePostInput({ ...ok, postType: "rant" }).postType).toBeDefined();
  });

  it("rejects an unknown visibility", () => {
    expect(
      validatePostInput({ ...ok, visibility: "friends" }).visibility,
    ).toBeDefined();
  });
});

describe("validateCommentInput", () => {
  it("rejects empty and over-long, accepts in range", () => {
    expect(
      validateCommentInput({ body: "  ", parentCommentId: null }).body,
    ).toBeDefined();
    expect(
      validateCommentInput({
        body: "y".repeat(COMMENT_BODY_MAX + 1),
        parentCommentId: 4,
      }).body,
    ).toBeDefined();
    expect(
      hasErrors(
        validateCommentInput({
          body: "y".repeat(COMMENT_BODY_MAX),
          parentCommentId: null,
        }),
      ),
    ).toBe(false);
  });
});

describe("parseCommentParentId", () => {
  it("accepts a positive integer string or number", () => {
    expect(parseCommentParentId("42")).toBe(42);
    expect(parseCommentParentId(7)).toBe(7);
  });

  it("returns null for anything else", () => {
    for (const value of ["0", "-1", "1.5", "abc", "", null, undefined, {}, 0, -3]) {
      expect(parseCommentParentId(value)).toBeNull();
    }
  });
});

describe("feed cursor", () => {
  it("round-trips a created_at + id", () => {
    const iso = "2026-09-10T12:00:00.000Z";
    const cursor = encodeFeedCursor(iso, 123);
    const parsed = parseFeedCursor(cursor);
    expect(parsed).toEqual({ beforeCreatedAt: iso, beforeId: 123 });
  });

  it("rejects malformed, non-decimal or out-of-range cursors", () => {
    for (const value of [
      undefined,
      null,
      "",
      "abc",
      "123",
      "2026-09-10T12:00:00.000Z",
      "|5",
      "2026-09-10T12:00:00.000Z|",
      "2026-09-10T12:00:00.000Z|0",
      "2026-09-10T12:00:00.000Z|-3",
      "2026-09-10T12:00:00.000Z|1.5",
      "not-a-date|5",
      ["a", "b"],
      42,
    ]) {
      expect(parseFeedCursor(value)).toBeNull();
    }
  });
});

describe("clampLimit", () => {
  it("defaults invalid values to the page size", () => {
    for (const value of [undefined, null, "", "abc", "0", "-5", "2.5", 0, -1, {}]) {
      expect(clampLimit(value)).toBe(FEED_PAGE_SIZE);
    }
  });

  it("caps a large request at the maximum", () => {
    expect(clampLimit("999")).toBe(FEED_MAX_LIMIT);
    expect(clampLimit(1000)).toBe(FEED_MAX_LIMIT);
  });

  it("passes a valid in-range request through", () => {
    expect(clampLimit("5")).toBe(5);
    expect(clampLimit(1)).toBe(1);
  });
});
