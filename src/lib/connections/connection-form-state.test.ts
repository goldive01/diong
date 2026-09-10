import { describe, expect, it } from "vitest";
import {
  EMPTY_CONNECTION_FORM,
  EMPTY_INTERACTION_FORM,
  readConnectionFormValues,
  readInteractionFormValues,
} from "./connection-form-state";

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.append(key, value);
  return data;
}

describe("readConnectionFormValues", () => {
  it("reads the six connection fields verbatim (no trimming here)", () => {
    const values = readConnectionFormValues(
      form({
        name: "  Sam  ",
        connectionType: "friend",
        connectionPurpose: "friendship",
        whyItMatters: "Keeps me honest",
        preferredContactDays: "30",
        notes: "note",
      }),
    );
    expect(values).toEqual({
      name: "  Sam  ",
      connectionType: "friend",
      connectionPurpose: "friendship",
      whyItMatters: "Keeps me honest",
      preferredContactDays: "30",
      notes: "note",
    });
  });

  it("falls back to empty strings for missing fields", () => {
    expect(readConnectionFormValues(form({}))).toEqual(EMPTY_CONNECTION_FORM);
  });

  it("never reads is_active from the form", () => {
    const values = readConnectionFormValues(form({ isActive: "false" }));
    expect(values).toEqual(EMPTY_CONNECTION_FORM);
    expect("isActive" in values).toBe(false);
  });
});

describe("readInteractionFormValues", () => {
  it("reads the three interaction fields", () => {
    const values = readInteractionFormValues(
      form({
        interactionType: "call",
        occurredAt: "2026-09-01T10:00",
        notes: "Caught up",
      }),
    );
    expect(values).toEqual({
      interactionType: "call",
      occurredAt: "2026-09-01T10:00",
      notes: "Caught up",
    });
  });

  it("falls back to empty strings and never reads a connection id", () => {
    const values = readInteractionFormValues(form({ connectionId: "99" }));
    expect(values).toEqual(EMPTY_INTERACTION_FORM);
    expect("connectionId" in values).toBe(false);
  });
});
