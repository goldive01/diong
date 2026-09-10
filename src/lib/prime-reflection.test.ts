import { describe, expect, it } from "vitest";
import {
  DEFAULT_REFLECTION_PROMPT,
  PRIME_REFLECTION_MAX_LENGTH,
  normalizePrimeReflection,
  readPrimeReflectionFormValues,
  validatePrimeReflection,
} from "./prime-reflection";

// Copy Diong must never use.
const FORBIDDEN = [
  "cure",
  "diagnos",
  "treatment",
  "guarantee",
  "manifest",
  "destiny",
];

function assertClean(text: string) {
  const lower = text.toLowerCase();
  for (const term of FORBIDDEN) {
    expect(lower, `"${text}" contains "${term}"`).not.toContain(term);
  }
}

describe("normalizePrimeReflection", () => {
  it("trims surrounding whitespace", () => {
    expect(normalizePrimeReflection("  hello  ")).toBe("hello");
    expect(normalizePrimeReflection("\n\t line \t\n")).toBe("line");
  });

  it("reduces an all-whitespace value to an empty string", () => {
    expect(normalizePrimeReflection("     ")).toBe("");
    expect(normalizePrimeReflection("")).toBe("");
  });
});

describe("validatePrimeReflection", () => {
  it("treats an empty reflection as valid (reflection is optional)", () => {
    expect(validatePrimeReflection("")).toBeUndefined();
  });

  it("accepts a value exactly at the limit", () => {
    expect(
      validatePrimeReflection("a".repeat(PRIME_REFLECTION_MAX_LENGTH)),
    ).toBeUndefined();
  });

  it("rejects a value one character over the limit", () => {
    const error = validatePrimeReflection(
      "a".repeat(PRIME_REFLECTION_MAX_LENGTH + 1),
    );
    expect(error).toBeTruthy();
    expect(error).toContain(String(PRIME_REFLECTION_MAX_LENGTH));
  });

  it("uses calm, non-forbidden copy", () => {
    assertClean(DEFAULT_REFLECTION_PROMPT);
    assertClean(
      validatePrimeReflection("a".repeat(PRIME_REFLECTION_MAX_LENGTH + 1)) ?? "",
    );
  });
});

describe("readPrimeReflectionFormValues", () => {
  it("reads the reflection field as a string", () => {
    const form = new FormData();
    form.set("reflection", "today went well");
    expect(readPrimeReflectionFormValues(form)).toEqual({
      reflection: "today went well",
    });
  });

  it("defaults to an empty string when the field is missing", () => {
    expect(readPrimeReflectionFormValues(new FormData())).toEqual({
      reflection: "",
    });
  });
});
