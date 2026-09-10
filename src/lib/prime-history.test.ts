import { describe, expect, it } from "vitest";
import {
  describeCompletionState,
  formatAssignedDate,
  formatCompletedAt,
  parsePrimeAssignmentId,
} from "./prime-history";

describe("parsePrimeAssignmentId", () => {
  it("accepts a positive base-10 integer", () => {
    expect(parsePrimeAssignmentId("1")).toBe(1);
    expect(parsePrimeAssignmentId("4207")).toBe(4207);
  });

  it("rejects everything that is not a positive integer", () => {
    for (const raw of ["", "0", "-1", "1.5", "1e3", "0x1", " 1 ", "1abc", "abc"]) {
      expect(parsePrimeAssignmentId(raw), raw).toBeNull();
    }
    expect(parsePrimeAssignmentId(undefined)).toBeNull();
  });

  it("rejects integers beyond the safe range", () => {
    expect(parsePrimeAssignmentId("99999999999999999999")).toBeNull();
  });
});

describe("formatAssignedDate", () => {
  it("formats an ISO calendar date in UTC", () => {
    const formatted = formatAssignedDate("2026-09-08");
    expect(formatted).toContain("2026");
    expect(formatted).toContain("September");
    expect(formatted).toContain("8");
  });

  it("returns an empty string for an unparseable value", () => {
    expect(formatAssignedDate("2026-9-8")).toBe("");
    expect(formatAssignedDate("not-a-date")).toBe("");
  });
});

describe("formatCompletedAt", () => {
  it("formats a valid timestamp and includes the year", () => {
    expect(formatCompletedAt("2026-06-15T12:00:00.000Z")).toContain("2026");
  });

  it("returns an empty string for a missing or unparseable value", () => {
    expect(formatCompletedAt(null)).toBe("");
    expect(formatCompletedAt("not-a-date")).toBe("");
  });
});

describe("describeCompletionState", () => {
  it("maps the boolean to plain language", () => {
    expect(describeCompletionState(true)).toBe("Completed");
    expect(describeCompletionState(false)).toBe("Not completed");
  });
});
