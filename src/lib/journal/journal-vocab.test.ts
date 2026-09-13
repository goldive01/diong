import { describe, expect, it } from "vitest";
import { JOURNAL_MOODS, isJournalMood } from "./journal-vocab";

describe("journal vocab", () => {
  it("exposes the eight moods", () => {
    expect([...JOURNAL_MOODS]).toEqual([
      "calm",
      "focused",
      "energised",
      "neutral",
      "stressed",
      "low",
      "grateful",
      "reflective",
    ]);
  });

  it("isJournalMood accepts only known moods", () => {
    for (const mood of JOURNAL_MOODS) {
      expect(isJournalMood(mood)).toBe(true);
    }
    for (const value of ["", "happy", "anxious", 1, null, undefined, {}]) {
      expect(isJournalMood(value)).toBe(false);
    }
  });
});
