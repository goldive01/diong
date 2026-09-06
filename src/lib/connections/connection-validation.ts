import type {
  ConnectionInteractionType,
  ConnectionPurpose,
  ConnectionType,
} from "@/src/types/database";
import {
  isConnectionPurpose,
  isConnectionType,
  isInteractionType,
} from "./connection-vocab";

// Pure validation and normalisation for the Connections application layer.
// This is a usability layer for forms and server actions. It does NOT replace
// the database CHECK constraints or the record_connection_interaction() RPC
// checks, which remain authoritative.

export const CONNECTION_NAME_MAX = 120;
export const CONNECTION_WHY_MAX = 500;
export const CONNECTION_NOTES_MAX = 2000;
export const CONTACT_DAYS_MIN = 1;
export const CONTACT_DAYS_MAX = 365;
export const INTERACTION_NOTES_MAX = 2000;

// Interactions dated more than this far ahead of "now" are rejected at the
// application layer, matching the RPC's own five-minute clock-skew tolerance.
export const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

function toText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return ["true", "on", "1", "yes"].includes(value.trim().toLowerCase());
  }
  return Boolean(value);
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

// ---------------------------------------------------------------------------
// Connection create / update input
// ---------------------------------------------------------------------------

export type ConnectionInput = {
  name: string;
  connectionType: string;
  connectionPurpose: string;
  whyItMatters: string;
  preferredContactDays: number | null;
  notes: string;
  isActive: boolean;
};

export type ConnectionField = keyof ConnectionInput;
export type ConnectionErrors = Partial<Record<ConnectionField, string>>;

export type RawConnectionInput = {
  name?: unknown;
  connectionType?: unknown;
  connectionPurpose?: unknown;
  whyItMatters?: unknown;
  preferredContactDays?: unknown;
  notes?: unknown;
  isActive?: unknown;
};

function toContactDays(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  const text = String(value).trim();
  if (text === "") return null;
  // A provided-but-unparseable value becomes NaN so validation can flag it
  // rather than silently discarding the field.
  return Number(text);
}

export function normalizeConnectionInput(
  raw: RawConnectionInput,
): ConnectionInput {
  return {
    name: toText(raw.name).trim(),
    connectionType: toText(raw.connectionType).trim(),
    connectionPurpose: toText(raw.connectionPurpose).trim(),
    whyItMatters: toText(raw.whyItMatters).trim(),
    preferredContactDays: toContactDays(raw.preferredContactDays),
    notes: toText(raw.notes).trim(),
    isActive: raw.isActive === undefined ? true : toBool(raw.isActive),
  };
}

export function validateConnectionInput(
  input: ConnectionInput,
): ConnectionErrors {
  const errors: ConnectionErrors = {};

  const name = input.name.trim();
  if (name.length === 0) {
    errors.name = "Enter a name for this connection.";
  } else if (name.length > CONNECTION_NAME_MAX) {
    errors.name = `Keep the name to ${CONNECTION_NAME_MAX} characters or fewer.`;
  }

  if (!isConnectionType(input.connectionType)) {
    errors.connectionType = "Choose a connection type.";
  }

  if (!isConnectionPurpose(input.connectionPurpose)) {
    errors.connectionPurpose = "Choose what this connection supports.";
  }

  if (input.whyItMatters.trim().length > CONNECTION_WHY_MAX) {
    errors.whyItMatters = `Keep this to ${CONNECTION_WHY_MAX} characters or fewer.`;
  }

  if (input.notes.trim().length > CONNECTION_NOTES_MAX) {
    errors.notes = `Keep notes to ${CONNECTION_NOTES_MAX} characters or fewer.`;
  }

  const days = input.preferredContactDays;
  if (days !== null) {
    if (
      !Number.isInteger(days) ||
      days < CONTACT_DAYS_MIN ||
      days > CONTACT_DAYS_MAX
    ) {
      errors.preferredContactDays =
        `Choose a rhythm between ${CONTACT_DAYS_MIN} and ${CONTACT_DAYS_MAX} days, or leave it blank.`;
    }
  }

  return errors;
}

export function hasConnectionErrors(errors: ConnectionErrors): boolean {
  return Object.keys(errors).length > 0;
}

// Column shape for a connections insert/update. Only call after
// validateConnectionInput() has returned no errors.
export type ConnectionColumns = {
  name: string;
  connection_type: ConnectionType;
  connection_purpose: ConnectionPurpose;
  why_it_matters: string | null;
  preferred_contact_days: number | null;
  notes: string | null;
  is_active: boolean;
};

export function connectionColumns(input: ConnectionInput): ConnectionColumns {
  if (
    !isConnectionType(input.connectionType) ||
    !isConnectionPurpose(input.connectionPurpose)
  ) {
    throw new Error("connectionColumns received unvalidated input");
  }

  return {
    name: input.name.trim(),
    connection_type: input.connectionType,
    connection_purpose: input.connectionPurpose,
    why_it_matters: emptyToNull(input.whyItMatters),
    preferred_contact_days: input.preferredContactDays,
    notes: emptyToNull(input.notes),
    is_active: input.isActive,
  };
}

// ---------------------------------------------------------------------------
// Interaction input
// ---------------------------------------------------------------------------

export type InteractionInput = {
  connectionId: number;
  interactionType: string;
  // Empty string means "use the server's now()".
  occurredAt: string;
  notes: string;
};

export type InteractionField = keyof InteractionInput;
export type InteractionErrors = Partial<Record<InteractionField, string>>;

export type RawInteractionInput = {
  connectionId?: unknown;
  interactionType?: unknown;
  occurredAt?: unknown;
  notes?: unknown;
};

export function normalizeInteractionInput(
  raw: RawInteractionInput,
): InteractionInput {
  const idText =
    typeof raw.connectionId === "number"
      ? String(raw.connectionId)
      : toText(raw.connectionId).trim();
  const parsedId = Number(idText);

  return {
    connectionId: idText === "" ? Number.NaN : parsedId,
    interactionType: toText(raw.interactionType).trim(),
    occurredAt: toText(raw.occurredAt).trim(),
    notes: toText(raw.notes).trim(),
  };
}

export function validateInteractionInput(
  input: InteractionInput,
): InteractionErrors {
  const errors: InteractionErrors = {};

  if (!Number.isSafeInteger(input.connectionId) || input.connectionId <= 0) {
    errors.connectionId = "Choose a connection.";
  }

  if (!isInteractionType(input.interactionType)) {
    errors.interactionType = "Choose how you connected.";
  }

  if (input.occurredAt !== "") {
    const time = Date.parse(input.occurredAt);
    if (Number.isNaN(time)) {
      errors.occurredAt = "Enter a valid date and time.";
    } else if (time > Date.now() + FUTURE_TOLERANCE_MS) {
      errors.occurredAt = "This time is in the future.";
    }
  }

  if (input.notes.trim().length > INTERACTION_NOTES_MAX) {
    errors.notes = `Keep notes to ${INTERACTION_NOTES_MAX} characters or fewer.`;
  }

  return errors;
}

export function hasInteractionErrors(errors: InteractionErrors): boolean {
  return Object.keys(errors).length > 0;
}

export type RecordInteractionArgs = {
  p_connection_id: number;
  p_interaction_type: ConnectionInteractionType;
  p_occurred_at?: string;
  p_notes?: string | null;
};

// Build the RPC argument object. Only call after validateInteractionInput()
// has returned no errors.
export function interactionRpcArgs(
  input: InteractionInput,
): RecordInteractionArgs {
  if (!isInteractionType(input.interactionType)) {
    throw new Error("interactionRpcArgs received unvalidated input");
  }

  const args: RecordInteractionArgs = {
    p_connection_id: input.connectionId,
    p_interaction_type: input.interactionType,
    p_notes: emptyToNull(input.notes),
  };

  if (input.occurredAt !== "") {
    args.p_occurred_at = new Date(input.occurredAt).toISOString();
  }

  return args;
}
