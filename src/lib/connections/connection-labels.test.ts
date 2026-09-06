import { describe, expect, it } from "vitest";
import {
  CONNECTION_PURPOSE_LABEL,
  CONNECTION_TYPE_LABEL,
  INTERACTION_TYPE_LABEL,
  NUDGE_STATUS_LABEL,
  suggestedConnectionAction,
} from "./connection-labels";
import {
  CONNECTION_PURPOSES,
  CONNECTION_TYPES,
  INTERACTION_TYPES,
} from "./connection-vocab";
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
