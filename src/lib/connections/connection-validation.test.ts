import { describe, expect, it } from "vitest";
import {
  CONNECTION_NAME_MAX,
  CONNECTION_NOTES_MAX,
  CONNECTION_WHY_MAX,
  CONTACT_DAYS_MAX,
  CONTACT_DAYS_MIN,
  connectionColumns,
  hasConnectionErrors,
  hasInteractionErrors,
  interactionRpcArgs,
  normalizeConnectionInput,
  normalizeInteractionInput,
  validateConnectionInput,
  validateInteractionInput,
  type ConnectionInput,
  type InteractionInput,
} from "./connection-validation";

function connection(overrides: Partial<ConnectionInput> = {}): ConnectionInput {
  return {
    name: "Daniel",
    connectionType: "mentor",
    connectionPurpose: "career_growth",
    whyItMatters: "Helps me think through direction.",
    preferredContactDays: 30,
    notes: "",
    isActive: true,
    ...overrides,
  };
}

function interaction(
  overrides: Partial<InteractionInput> = {},
): InteractionInput {
  return {
    connectionId: 12,
    interactionType: "message",
    occurredAt: "",
    notes: "",
    ...overrides,
  };
}

describe("validateConnectionInput", () => {
  it("accepts a valid connection", () => {
    expect(validateConnectionInput(connection())).toEqual({});
  });

  it("accepts a connection with only the required fields", () => {
    const errors = validateConnectionInput(
      connection({
        whyItMatters: "",
        notes: "",
        preferredContactDays: null,
      }),
    );
    expect(errors).toEqual({});
  });

  it("rejects an empty name", () => {
    expect(validateConnectionInput(connection({ name: "" })).name).toBeDefined();
    expect(
      validateConnectionInput(connection({ name: "   " })).name,
    ).toBeDefined();
  });

  it("accepts a name at the maximum length and rejects one over it", () => {
    expect(
      validateConnectionInput(connection({ name: "a".repeat(CONNECTION_NAME_MAX) }))
        .name,
    ).toBeUndefined();
    expect(
      validateConnectionInput(
        connection({ name: "a".repeat(CONNECTION_NAME_MAX + 1) }),
      ).name,
    ).toBeDefined();
  });

  it("rejects an unsupported connection type", () => {
    expect(
      validateConnectionInput(connection({ connectionType: "stranger" }))
        .connectionType,
    ).toBeDefined();
    expect(
      validateConnectionInput(connection({ connectionType: "" })).connectionType,
    ).toBeDefined();
  });

  it("rejects an unsupported purpose", () => {
    expect(
      validateConnectionInput(connection({ connectionPurpose: "romance" }))
        .connectionPurpose,
    ).toBeDefined();
  });

  it("rejects preferred_contact_days below the minimum", () => {
    expect(
      validateConnectionInput(
        connection({ preferredContactDays: CONTACT_DAYS_MIN - 1 }),
      ).preferredContactDays,
    ).toBeDefined();
    expect(
      validateConnectionInput(connection({ preferredContactDays: 0 }))
        .preferredContactDays,
    ).toBeDefined();
  });

  it("rejects preferred_contact_days above the maximum", () => {
    expect(
      validateConnectionInput(
        connection({ preferredContactDays: CONTACT_DAYS_MAX + 1 }),
      ).preferredContactDays,
    ).toBeDefined();
  });

  it("accepts preferred_contact_days at each boundary and null", () => {
    for (const value of [CONTACT_DAYS_MIN, CONTACT_DAYS_MAX, null]) {
      expect(
        validateConnectionInput(connection({ preferredContactDays: value }))
          .preferredContactDays,
      ).toBeUndefined();
    }
  });

  it("rejects a non-integer rhythm", () => {
    expect(
      validateConnectionInput(connection({ preferredContactDays: 30.5 }))
        .preferredContactDays,
    ).toBeDefined();
    expect(
      validateConnectionInput(connection({ preferredContactDays: Number.NaN }))
        .preferredContactDays,
    ).toBeDefined();
  });

  it("rejects why_it_matters and notes over their limits", () => {
    expect(
      validateConnectionInput(
        connection({ whyItMatters: "x".repeat(CONNECTION_WHY_MAX + 1) }),
      ).whyItMatters,
    ).toBeDefined();
    expect(
      validateConnectionInput(
        connection({ notes: "x".repeat(CONNECTION_NOTES_MAX + 1) }),
      ).notes,
    ).toBeDefined();
  });

  it("hasConnectionErrors reflects the error map", () => {
    expect(hasConnectionErrors({})).toBe(false);
    expect(hasConnectionErrors({ name: "bad" })).toBe(true);
  });
});

describe("normalizeConnectionInput", () => {
  it("trims text and coerces types", () => {
    const result = normalizeConnectionInput({
      name: "  Daniel  ",
      connectionType: " mentor ",
      connectionPurpose: "career_growth",
      whyItMatters: "  ",
      preferredContactDays: "30",
      notes: "  a note ",
      isActive: "on",
    });
    expect(result).toEqual({
      name: "Daniel",
      connectionType: "mentor",
      connectionPurpose: "career_growth",
      whyItMatters: "",
      preferredContactDays: 30,
      notes: "a note",
      isActive: true,
    });
  });

  it("treats a blank rhythm as null and defaults isActive to true", () => {
    const result = normalizeConnectionInput({ name: "A", preferredContactDays: "" });
    expect(result.preferredContactDays).toBeNull();
    expect(result.isActive).toBe(true);
  });

  it("normalises empty optional fields to null via connectionColumns", () => {
    const columns = connectionColumns(
      connection({ whyItMatters: "   ", notes: "" }),
    );
    expect(columns.why_it_matters).toBeNull();
    expect(columns.notes).toBeNull();
    expect(columns.connection_type).toBe("mentor");
  });

  it("connectionColumns throws on unvalidated input", () => {
    expect(() =>
      connectionColumns(connection({ connectionType: "nope" })),
    ).toThrow();
  });
});

describe("validateInteractionInput", () => {
  it("accepts a valid interaction with no explicit time", () => {
    expect(validateInteractionInput(interaction())).toEqual({});
  });

  it("accepts a recent past timestamp", () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(
      validateInteractionInput(interaction({ occurredAt: yesterday })).occurredAt,
    ).toBeUndefined();
  });

  it("rejects an obviously future timestamp", () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    expect(
      validateInteractionInput(interaction({ occurredAt: tomorrow })).occurredAt,
    ).toBeDefined();
  });

  it("rejects an unparseable timestamp", () => {
    expect(
      validateInteractionInput(interaction({ occurredAt: "not-a-date" }))
        .occurredAt,
    ).toBeDefined();
  });

  it("rejects an invalid interaction type", () => {
    expect(
      validateInteractionInput(interaction({ interactionType: "lunch" }))
        .interactionType,
    ).toBeDefined();
  });

  it("rejects a missing or non-positive connection id", () => {
    expect(
      validateInteractionInput(interaction({ connectionId: Number.NaN }))
        .connectionId,
    ).toBeDefined();
    expect(
      validateInteractionInput(interaction({ connectionId: 0 })).connectionId,
    ).toBeDefined();
    expect(
      validateInteractionInput(interaction({ connectionId: -3 })).connectionId,
    ).toBeDefined();
  });

  it("rejects notes over the limit", () => {
    expect(
      validateInteractionInput(
        interaction({ notes: "x".repeat(CONNECTION_NOTES_MAX + 1) }),
      ).notes,
    ).toBeDefined();
  });

  it("hasInteractionErrors reflects the error map", () => {
    expect(hasInteractionErrors({})).toBe(false);
    expect(hasInteractionErrors({ interactionType: "bad" })).toBe(true);
  });
});

describe("normalizeInteractionInput / interactionRpcArgs", () => {
  it("parses a form-style payload", () => {
    const result = normalizeInteractionInput({
      connectionId: "12",
      interactionType: " message ",
      occurredAt: "  ",
      notes: "  said hello  ",
    });
    expect(result).toEqual({
      connectionId: 12,
      interactionType: "message",
      occurredAt: "",
      notes: "said hello",
    });
  });

  it("omits p_occurred_at when no time is given and nulls empty notes", () => {
    const args = interactionRpcArgs(interaction());
    expect(args).toEqual({
      p_connection_id: 12,
      p_interaction_type: "message",
      p_notes: null,
    });
    expect("p_occurred_at" in args).toBe(false);
  });

  it("passes an ISO timestamp when a time is given", () => {
    const when = "2026-01-02T03:04:00.000Z";
    const args = interactionRpcArgs(interaction({ occurredAt: when }));
    expect(args.p_occurred_at).toBe(when);
  });

  it("throws when the interaction type was never validated", () => {
    expect(() =>
      interactionRpcArgs(interaction({ interactionType: "brunch" })),
    ).toThrow();
  });
});
