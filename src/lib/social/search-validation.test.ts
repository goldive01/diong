import { describe, expect, it } from "vitest";
import {
  MAX_QUERY_LENGTH,
  MIN_QUERY_LENGTH,
  parseSearchQuery,
} from "./search-validation";

describe("parseSearchQuery", () => {
  it("trims and reports valid for a normal query", () => {
    expect(parseSearchQuery("  daniel  ")).toEqual({
      query: "daniel",
      valid: true,
    });
  });

  it("collapses runs of internal whitespace to one space", () => {
    expect(parseSearchQuery("daniel   kim\t\tgrowth")).toEqual({
      query: "daniel kim growth",
      valid: true,
    });
  });

  it("is invalid for an empty or whitespace-only query", () => {
    expect(parseSearchQuery("")).toEqual({ query: "", valid: false });
    expect(parseSearchQuery("   ")).toEqual({ query: "", valid: false });
    expect(parseSearchQuery(undefined)).toEqual({ query: "", valid: false });
    expect(parseSearchQuery(null)).toEqual({ query: "", valid: false });
  });

  it(`is invalid below MIN_QUERY_LENGTH (${MIN_QUERY_LENGTH})`, () => {
    expect(parseSearchQuery("a")).toEqual({ query: "a", valid: false });
  });

  it(`is valid at exactly MIN_QUERY_LENGTH (${MIN_QUERY_LENGTH})`, () => {
    const result = parseSearchQuery("ab");
    expect(result.query).toBe("ab");
    expect(result.valid).toBe(true);
  });

  it(`truncates to MAX_QUERY_LENGTH (${MAX_QUERY_LENGTH}) rather than erroring`, () => {
    const huge = "a".repeat(MAX_QUERY_LENGTH + 5000);
    const result = parseSearchQuery(huge);
    expect(result.query.length).toBe(MAX_QUERY_LENGTH);
    expect(result.valid).toBe(true);
  });

  it("takes the first element of an array value", () => {
    expect(parseSearchQuery(["daniel", "ignored"])).toEqual({
      query: "daniel",
      valid: true,
    });
  });

  it("is invalid for a non-string, non-array value", () => {
    expect(parseSearchQuery(42)).toEqual({ query: "", valid: false });
    expect(parseSearchQuery({})).toEqual({ query: "", valid: false });
  });
});
