import type {
  ConnectionErrors,
  InteractionErrors,
} from "@/src/lib/connections/connection-validation";

// Plain (non-"use server") module. Holds the shared form value shapes, the
// action-state shapes and the FormData readers used by both the Connections
// server actions and the client forms. Runtime constants cannot be exported
// from a "use server" file, so they live here.

// ---------------------------------------------------------------------------
// Connection create / edit form
// ---------------------------------------------------------------------------

// String-only shape the form fields hold, echoed back so a validation failure
// never loses what the user typed (also covers the no-JS path). `is_active` is
// deliberately absent: activation is a separate, explicit action, never a side
// effect of editing the connection's details.
export type ConnectionFormValues = {
  name: string;
  connectionType: string;
  connectionPurpose: string;
  whyItMatters: string;
  preferredContactDays: string;
  notes: string;
};

export type CreateConnectionState = {
  errors: ConnectionErrors;
  message: string;
  values?: ConnectionFormValues;
};

export const EMPTY_CONNECTION_FORM: ConnectionFormValues = {
  name: "",
  connectionType: "",
  connectionPurpose: "",
  whyItMatters: "",
  preferredContactDays: "",
  notes: "",
};

function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function readConnectionFormValues(formData: FormData): ConnectionFormValues {
  return {
    name: readText(formData, "name"),
    connectionType: readText(formData, "connectionType"),
    connectionPurpose: readText(formData, "connectionPurpose"),
    whyItMatters: readText(formData, "whyItMatters"),
    preferredContactDays: readText(formData, "preferredContactDays"),
    notes: readText(formData, "notes"),
  };
}

// ---------------------------------------------------------------------------
// Record-interaction form
// ---------------------------------------------------------------------------

// String-only shape. The connection id is never a form field; it is bound to
// the server action on the server, so it can neither be read nor changed by the
// browser.
export type InteractionFormValues = {
  interactionType: string;
  occurredAt: string;
  notes: string;
};

export type RecordInteractionState = {
  status: "idle" | "success" | "error";
  errors: InteractionErrors;
  message: string;
  values?: InteractionFormValues;
};

export const EMPTY_INTERACTION_FORM: InteractionFormValues = {
  interactionType: "",
  occurredAt: "",
  notes: "",
};

export function readInteractionFormValues(
  formData: FormData,
): InteractionFormValues {
  return {
    interactionType: readText(formData, "interactionType"),
    occurredAt: readText(formData, "occurredAt"),
    notes: readText(formData, "notes"),
  };
}

// ---------------------------------------------------------------------------
// Activate / deactivate action
// ---------------------------------------------------------------------------

export type ConnectionActiveState = {
  status: "idle" | "success" | "error";
  message: string;
};
