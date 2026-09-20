// Pure normalisation and validation for the Daily Direction application
// layer. A usability layer for forms and server actions — it does NOT
// replace the database CHECK constraints in
// 202609150001_daily_direction.sql, which remain authoritative.

export const INTENTION_MAX = 280;
export const DESIRED_IDENTITY_MAX = 160;
export const PRIMARY_ACTION_MAX = 240;
export const WHY_IT_MATTERS_MAX = 1000;

function toText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

// ---------------------------------------------------------------------------
// Direction create / edit input
// ---------------------------------------------------------------------------

export type DirectionInput = {
  intention: string;
  desiredIdentity: string;
  primaryAction: string;
  whyItMatters: string;
};

export type DirectionField = keyof DirectionInput;
export type DirectionErrors = Partial<Record<DirectionField, string>>;

export type RawDirectionInput = {
  intention?: unknown;
  desiredIdentity?: unknown;
  primaryAction?: unknown;
  whyItMatters?: unknown;
};

export function normalizeDirectionInput(raw: RawDirectionInput): DirectionInput {
  return {
    intention: toText(raw.intention).trim(),
    desiredIdentity: toText(raw.desiredIdentity).trim(),
    primaryAction: toText(raw.primaryAction).trim(),
    whyItMatters: toText(raw.whyItMatters).trim(),
  };
}

// The only required prompt — "the most meaningful action you need to take
// today" is enough on its own for the record to be useful. The other three
// prompts are optional, matching the brief's "do not make every field
// mandatory if that harms usability."
export function validateDirectionInput(input: DirectionInput): DirectionErrors {
  const errors: DirectionErrors = {};

  if (input.primaryAction.length < 1 || input.primaryAction.length > PRIMARY_ACTION_MAX) {
    errors.primaryAction = `Choose one action between 1 and ${PRIMARY_ACTION_MAX} characters.`;
  }

  if (input.intention.length > INTENTION_MAX) {
    errors.intention = `Keep this to ${INTENTION_MAX} characters or fewer.`;
  }

  if (input.desiredIdentity.length > DESIRED_IDENTITY_MAX) {
    errors.desiredIdentity = `Keep this to ${DESIRED_IDENTITY_MAX} characters or fewer.`;
  }

  if (input.whyItMatters.length > WHY_IT_MATTERS_MAX) {
    errors.whyItMatters = `Keep this to ${WHY_IT_MATTERS_MAX} characters or fewer.`;
  }

  return errors;
}

export function hasDirectionErrors(errors: DirectionErrors): boolean {
  return Object.keys(errors).length > 0;
}

export type DirectionColumns = {
  intention: string | null;
  desired_identity: string | null;
  primary_action: string;
  why_it_matters: string | null;
};

// Only call after validateDirectionInput() has returned no errors.
export function directionColumns(input: DirectionInput): DirectionColumns {
  return {
    intention: emptyToNull(input.intention),
    desired_identity: emptyToNull(input.desiredIdentity),
    primary_action: input.primaryAction.trim(),
    why_it_matters: emptyToNull(input.whyItMatters),
  };
}

// ---------------------------------------------------------------------------
// Optional goal / habit link
// ---------------------------------------------------------------------------

/** Parses an optional "link to a goal/habit" select field: "" means no
 * link (null), anything else must be a positive integer id. Invalid input
 * (a tampered value that isn't a real option) is treated as "no link"
 * rather than surfaced as a field error — this selector only ever offers
 * the user's own real goals/habits as options. */
export function parseOptionalLinkId(value: unknown): number | null {
  const text = typeof value === "number" ? String(value) : toText(value).trim();
  if (text === "") return null;
  if (!/^\d+$/.test(text)) return null;
  const id = Number(text);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

// ---------------------------------------------------------------------------
// ID parsing
// ---------------------------------------------------------------------------

/** Parses a route param / bound id into a safe positive integer, or null. */
export function parseDirectionId(raw: unknown): number | null {
  const text = typeof raw === "number" ? String(raw) : toText(raw).trim();
  if (!/^\d+$/.test(text)) return null;
  const id = Number(text);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

// ---------------------------------------------------------------------------
// Mutability window
// ---------------------------------------------------------------------------

/** A Daily Direction can only be edited, completed, skipped or reopened on
 * its own direction_date — never after. Mirrors the `direction_date =
 * current_date` clause the database's UPDATE policy enforces
 * (202609150001_daily_direction.sql); this is the same rule checked a
 * second time at the application layer, against the same UTC "today"
 * (todayIsoDate(), src/lib/app/date.ts) current_date already resolves to. */
export function isDirectionEditableToday(directionDate: string, today: string): boolean {
  return directionDate === today;
}
