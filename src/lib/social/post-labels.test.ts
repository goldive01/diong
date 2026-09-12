import { describe, expect, it } from "vitest";
import {
  commentLabel,
  formatPostTimestamp,
  likeLabel,
  postTypeLabel,
  visibilityShort,
} from "./post-labels";

describe("engagement labels", () => {
  it("likeLabel pluralises and compacts", () => {
    expect(likeLabel(0)).toBe("0 likes");
    expect(likeLabel(1)).toBe("1 like");
    expect(likeLabel(12)).toBe("12 likes");
    expect(likeLabel(1500)).toBe("1.5k likes");
    expect(likeLabel(null)).toBe("0 likes");
  });

  it("commentLabel pluralises", () => {
    expect(commentLabel(1)).toBe("1 comment");
    expect(commentLabel(4)).toBe("4 comments");
    expect(commentLabel(undefined)).toBe("0 comments");
  });
});

describe("vocab labels", () => {
  it("maps a known post type and falls back", () => {
    expect(postTypeLabel("learning")).toBe("Something I learned");
    expect(postTypeLabel("mystery")).toBe("Post");
  });

  it("maps a known visibility and falls back", () => {
    expect(visibilityShort("followers")).toBe("Followers");
    expect(visibilityShort("nope")).toBe("Post");
  });
});

describe("formatPostTimestamp", () => {
  const now = new Date("2026-09-10T12:00:00.000Z");

  it("shows 'just now' inside 45 seconds", () => {
    expect(formatPostTimestamp("2026-09-10T11:59:30.000Z", now)).toBe("just now");
  });

  it("shows relative minutes and hours within a day", () => {
    expect(formatPostTimestamp("2026-09-10T11:30:00.000Z", now)).toContain(
      "30 minutes ago",
    );
    expect(formatPostTimestamp("2026-09-10T09:00:00.000Z", now)).toContain(
      "3 hours ago",
    );
  });

  it("falls back to an absolute date beyond a week", () => {
    expect(formatPostTimestamp("2026-08-01T09:00:00.000Z", now)).toMatch(
      /2026/,
    );
  });

  it("returns an empty string for a bad value", () => {
    expect(formatPostTimestamp("not-a-date", now)).toBe("");
    expect(formatPostTimestamp(null, now)).toBe("");
  });
});
