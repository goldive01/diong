import { describe, expect, it } from "vitest";
import {
  REPORT_DETAILS_MAX,
  hasReportErrors,
  reportReasonOptions,
  validateReportInput,
} from "./report-validation";
import { REPORT_REASONS } from "./community-vocab";

describe("reportReasonOptions", () => {
  it("returns one option per known reason, in vocab order", () => {
    const options = reportReasonOptions();
    expect(options.map((o) => o.value)).toEqual([...REPORT_REASONS]);
    expect(options.every((o) => o.label.length > 0)).toBe(true);
  });
});

describe("validateReportInput", () => {
  it("accepts a valid reason with no details", () => {
    expect(validateReportInput({ reason: "spam", details: "" })).toEqual({});
  });

  it("accepts a valid reason with details", () => {
    expect(
      validateReportInput({ reason: "other", details: "Some context." }),
    ).toEqual({});
  });

  it("rejects a missing or unknown reason", () => {
    for (const bad of ["", "made-up-reason", "SPAM"]) {
      expect(validateReportInput({ reason: bad, details: "" }).reason).toBeDefined();
    }
  });

  it("rejects details over the max length", () => {
    expect(
      validateReportInput({
        reason: "spam",
        details: "a".repeat(REPORT_DETAILS_MAX + 1),
      }).details,
    ).toBeDefined();
  });

  it("accepts details at exactly the max length", () => {
    expect(
      validateReportInput({
        reason: "spam",
        details: "a".repeat(REPORT_DETAILS_MAX),
      }).details,
    ).toBeUndefined();
  });
});

describe("hasReportErrors", () => {
  it("is false for an empty error set", () => {
    expect(hasReportErrors({})).toBe(false);
  });

  it("is true when any field has an error", () => {
    expect(hasReportErrors({ reason: "bad" })).toBe(true);
  });
});
