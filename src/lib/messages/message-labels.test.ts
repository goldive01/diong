import { describe, expect, it } from "vitest";
import { messageSnippet } from "./message-labels";

describe("messageSnippet", () => {
  it("returns an empty string for null", () => {
    expect(messageSnippet(null)).toBe("");
  });

  it("collapses internal whitespace/newlines to single spaces", () => {
    expect(messageSnippet("hello\n\nworld   there")).toBe("hello world there");
  });

  it("passes short text through untouched (after collapsing)", () => {
    expect(messageSnippet("hi")).toBe("hi");
  });

  it("truncates long text with an ellipsis at the max length", () => {
    const long = "a".repeat(200);
    const snippet = messageSnippet(long);
    expect(snippet.length).toBe(80);
    expect(snippet.endsWith("…")).toBe(true);
  });
});
