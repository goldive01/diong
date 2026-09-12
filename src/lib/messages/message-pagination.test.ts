import { describe, expect, it } from "vitest";
import { MAX_LIMIT, PAGE_SIZE, clampLimit, encodeCursor, parseCursor } from "./message-pagination";

describe("cursor encode/parse", () => {
  it("round-trips a valid cursor", () => {
    const encoded = encodeCursor("2026-09-12T10:00:00.000Z", 42);
    expect(parseCursor(encoded)).toEqual({
      beforeAt: "2026-09-12T10:00:00.000Z",
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
      "2026-09-12T10:00:00.000Z|1.5",
      42,
      {},
    ]) {
      expect(parseCursor(bad)).toBeNull();
    }
  });

  it("takes the first element of an array value", () => {
    const encoded = encodeCursor("2026-09-12T10:00:00.000Z", 7);
    expect(parseCursor([encoded, "ignored"])).toEqual({
      beforeAt: "2026-09-12T10:00:00.000Z",
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
    expect(clampLimit("1000")).toBe(MAX_LIMIT);
  });

  it("passes through a valid in-range value", () => {
    expect(clampLimit(5)).toBe(5);
    expect(clampLimit("5")).toBe(5);
  });
});
