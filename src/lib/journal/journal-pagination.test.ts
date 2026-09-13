import { describe, expect, it } from "vitest";
import { MAX_PAGE, PAGE_SIZE, getOffsetPagination, parsePageNumber } from "./journal-pagination";

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

  it("takes the first element of an array value", () => {
    expect(parsePageNumber(["2", "5"])).toBe(2);
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
