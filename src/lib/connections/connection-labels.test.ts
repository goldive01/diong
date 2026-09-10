import { describe, expect, it } from "vitest";
import {
  CONNECTION_PURPOSE_LABEL,
  CONNECTION_TYPE_LABEL,
  CONTACT_RHYTHM_OPTIONS,
  describeContactRhythm,
  describeLastContactMoment,
  describeLastMeaningfulContact,
  formatInteractionMoment,
  INTERACTION_TYPE_LABEL,
  NUDGE_STATUS_LABEL,
  nudgeReconnectPrompt,
  suggestedConnectionAction,
} from "./connection-labels";
import {
  CONNECTION_PURPOSES,
  CONNECTION_TYPES,
  INTERACTION_TYPES,
} from "./connection-vocab";
import {
  CONTACT_DAYS_MAX,
  CONTACT_DAYS_MIN,
  validateConnectionInput,
} from "./connection-validation";
import type { ConnectionNudgeStatus } from "@/src/types/database";

// Terminology Diong must never use: dating / romance, medical / treatment
// claims, guaranteed outcomes, mystical framing.
const FORBIDDEN = [
  "dating",
  "romantic",
  "romance",
  "soulmate",
  "soul mate",
  "flirt",
  "matchmak",
  "cure",
  "diagnos",
  "treatment",
  "guarantee",
  "manifest",
  "horoscope",
  "zodiac",
  "astrolog",
  "destiny",
  "the universe",
];

function assertClean(text: string) {
  const lower = text.toLowerCase();
  for (const term of FORBIDDEN) {
    expect(lower, `"${text}" contains "${term}"`).not.toContain(term);
  }
}

const ACTIONABLE_STATUSES: ConnectionNudgeStatus[] = [
  "due",
  "never_contacted",
  "approaching",
];

describe("label maps", () => {
  it("cover every connection type", () => {
    for (const type of CONNECTION_TYPES) {
      expect(CONNECTION_TYPE_LABEL[type], type).toBeTruthy();
    }
    expect(Object.keys(CONNECTION_TYPE_LABEL).sort()).toEqual(
      [...CONNECTION_TYPES].sort(),
    );
  });

  it("cover every connection purpose", () => {
    for (const purpose of CONNECTION_PURPOSES) {
      expect(CONNECTION_PURPOSE_LABEL[purpose], purpose).toBeTruthy();
    }
    expect(Object.keys(CONNECTION_PURPOSE_LABEL).sort()).toEqual(
      [...CONNECTION_PURPOSES].sort(),
    );
  });

  it("cover every interaction type", () => {
    for (const type of INTERACTION_TYPES) {
      expect(INTERACTION_TYPE_LABEL[type], type).toBeTruthy();
    }
  });

  it("cover every nudge status", () => {
    for (const status of [
      ...ACTIONABLE_STATUSES,
      "up_to_date",
    ] as ConnectionNudgeStatus[]) {
      expect(NUDGE_STATUS_LABEL[status], status).toBeTruthy();
    }
  });

  it("use only calm, non-romantic, non-medical copy", () => {
    for (const value of [
      ...Object.values(CONNECTION_TYPE_LABEL),
      ...Object.values(CONNECTION_PURPOSE_LABEL),
      ...Object.values(INTERACTION_TYPE_LABEL),
      ...Object.values(NUDGE_STATUS_LABEL),
    ]) {
      assertClean(value);
    }
  });
});

describe("suggestedConnectionAction", () => {
  it("returns non-empty, clean copy for every type in an actionable state", () => {
    for (const connectionType of CONNECTION_TYPES) {
      for (const status of ACTIONABLE_STATUSES) {
        const action = suggestedConnectionAction({ connectionType, status });
        expect(action.length, `${connectionType}/${status}`).toBeGreaterThan(0);
        assertClean(action);
      }
    }
  });

  it("returns no action for an up-to-date connection", () => {
    for (const connectionType of CONNECTION_TYPES) {
      expect(
        suggestedConnectionAction({ connectionType, status: "up_to_date" }),
      ).toBe("");
    }
  });

  it("is deterministic", () => {
    const first = suggestedConnectionAction({
      connectionType: "mentor",
      status: "due",
    });
    const second = suggestedConnectionAction({
      connectionType: "mentor",
      status: "due",
    });
    expect(first).toBe(second);
  });
});

describe("nudgeReconnectPrompt", () => {
  it("returns non-empty, clean copy for every actionable status", () => {
    for (const status of ACTIONABLE_STATUSES) {
      const prompt = nudgeReconnectPrompt(status);
      expect(prompt.length, status).toBeGreaterThan(0);
      assertClean(prompt);
    }
  });

  it("returns no prompt for an up-to-date connection", () => {
    expect(nudgeReconnectPrompt("up_to_date")).toBe("");
  });

  it("is deterministic", () => {
    expect(nudgeReconnectPrompt("due")).toBe(nudgeReconnectPrompt("due"));
  });
});

describe("describeLastMeaningfulContact", () => {
  it("handles the never-contacted, today and yesterday cases", () => {
    expect(describeLastMeaningfulContact(null)).toBe(
      "No meaningful contact recorded yet",
    );
    expect(describeLastMeaningfulContact(0)).toBe(
      "Last meaningful contact: today",
    );
    expect(describeLastMeaningfulContact(1)).toBe(
      "Last meaningful contact: yesterday",
    );
  });

  it("describes a number of days and never shows a negative", () => {
    expect(describeLastMeaningfulContact(24)).toBe(
      "Last meaningful contact: 24 days ago",
    );
    expect(describeLastMeaningfulContact(-3)).toBe(
      "Last meaningful contact: today",
    );
  });
});

describe("describeContactRhythm", () => {
  it("uses the friendly preset label when one matches", () => {
    expect(describeContactRhythm(7)).toBe("About weekly");
    expect(describeContactRhythm(30)).toBe("About monthly");
  });

  it("falls back to a plain description and handles null", () => {
    expect(describeContactRhythm(21)).toBe("About every 21 days");
    expect(describeContactRhythm(null)).toBe("No set rhythm");
  });
});

describe("formatInteractionMoment / describeLastContactMoment", () => {
  it("formats a valid timestamp and includes the year", () => {
    // Midday UTC stays on the same calendar year in every real time zone.
    const formatted = formatInteractionMoment("2026-06-15T12:00:00.000Z");
    expect(formatted).toContain("2026");
    expect(formatted.length).toBeGreaterThan(0);
  });

  it("returns an empty string for a missing or unparseable value", () => {
    expect(formatInteractionMoment(null)).toBe("");
    expect(formatInteractionMoment("not-a-date")).toBe("");
  });

  it("describes the last-contact case with a fallback for null", () => {
    expect(describeLastContactMoment(null)).toBe(
      "No meaningful contact recorded yet",
    );
    expect(describeLastContactMoment("2026-06-15T12:00:00.000Z")).toContain(
      "Last meaningful contact:",
    );
  });
});

describe("CONTACT_RHYTHM_OPTIONS", () => {
  it("offers a blank option and clean labels", () => {
    expect(CONTACT_RHYTHM_OPTIONS[0].value).toBe("");
    for (const option of CONTACT_RHYTHM_OPTIONS) {
      assertClean(option.label);
    }
  });

  it("every non-blank value is a rhythm the validator accepts", () => {
    for (const option of CONTACT_RHYTHM_OPTIONS) {
      if (option.value === "") continue;
      const days = Number(option.value);
      expect(Number.isInteger(days)).toBe(true);
      expect(days).toBeGreaterThanOrEqual(CONTACT_DAYS_MIN);
      expect(days).toBeLessThanOrEqual(CONTACT_DAYS_MAX);
      const errors = validateConnectionInput({
        name: "A",
        connectionType: "friend",
        connectionPurpose: "friendship",
        whyItMatters: "",
        preferredContactDays: days,
        notes: "",
        isActive: true,
      });
      expect(errors.preferredContactDays).toBeUndefined();
    }
  });
});
