import { describe, expect, it } from "vitest";
import {
  MAX_LIMIT,
  MAX_PAGE,
  PAGE_SIZE,
  clampLimit,
  encodeCommunityPostCursor,
  getOffsetPagination,
  parseCommunityPostCursor,
  parsePageNumber,
} from "./community-pagination";

describe("community post cursor encode/parse", () => {
  it("round-trips a valid cursor", () => {
    const encoded = encodeCommunityPostCursor("2026-09-12T10:00:00.000Z", 42);
    expect(parseCommunityPostCursor(encoded)).toEqual({
      beforeCreatedAt: "2026-09-12T10:00:00.000Z",
      beforeId: 42,
    });
  });

  it("returns null for a missing, malformed or out-of-range cursor", () => {
    for (const bad of [
      null,
      undefined,
      "",
      "no-separator",
      "2026-09-12|",
      "|42",
      "not-a-date|42",
      "2026-09-12T10:00:00.000Z|0",
      "2026-09-12T10:00:00.000Z|-1",
      "2026-09-12T10:00:00.000Z|abc",
      42,
      {},
    ]) {
      expect(parseCommunityPostCursor(bad)).toBeNull();
    }
  });

  it("takes the first element of an array value", () => {
    const encoded = encodeCommunityPostCursor("2026-09-12T10:00:00.000Z", 7);
    expect(parseCommunityPostCursor([encoded, "ignored"])).toEqual({
      beforeCreatedAt: "2026-09-12T10:00:00.000Z",
      beforeId: 7,
    });
  });
});

describe("clampLimit", () => {
  it("defaults to PAGE_SIZE for anything invalid", () => {
    for (const bad of [null, undefined, "", "abc", -1, 0, 1.5, "1.5"]) {
      expect(clampLimit(bad)).toBe(PAGE_SIZE);
    }
  });

  it("clamps to MAX_LIMIT", () => {
    expect(clampLimit(1000)).toBe(MAX_LIMIT);
  });
});

describe("parsePageNumber", () => {
  it("defaults to 1 for anything invalid", () => {
    for (const bad of [null, undefined, "", "0", "-1", "abc", 0, -1, 1.5]) {
      expect(parsePageNumber(bad)).toBe(1);
    }
  });

  it("clamps to MAX_PAGE", () => {
    expect(parsePageNumber(MAX_PAGE + 100)).toBe(MAX_PAGE);
  });

  it("passes through a valid page number", () => {
    expect(parsePageNumber(3)).toBe(3);
    expect(parsePageNumber("3")).toBe(3);
  });
});

describe("getOffsetPagination", () => {
  it("computes the offset window for a page", () => {
    expect(getOffsetPagination(1)).toEqual({ page: 1, pageSize: PAGE_SIZE, offset: 0 });
    expect(getOffsetPagination(3)).toEqual({
      page: 3,
      pageSize: PAGE_SIZE,
      offset: PAGE_SIZE * 2,
    });
  });

  it("falls back to page 1 for an invalid page", () => {
    expect(getOffsetPagination(0).page).toBe(1);
  });

  it("clamps to MAX_PAGE", () => {
    expect(getOffsetPagination(MAX_PAGE + 1).page).toBe(MAX_PAGE);
  });
});
