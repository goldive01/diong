import type { HabitFrequency } from "@/src/types/database";
import { isHabitFrequency } from "./habit-vocab";

// Pure normalisation and validation for the Habits application layer. A
// usability layer for forms and server actions — it does NOT replace the
// database CHECK constraints or the check_in_habit() / undo_habit_checkin()
// RPC checks, which remain authoritative.

export const HABIT_NAME_MAX = 120;
export const HABIT_DESCRIPTION_MAX = 1000;
export const TARGET_PER_PERIOD_MIN = 1;
export const TARGET_PER_PERIOD_MAX = 100;
export const CHECKIN_VALUE_MIN = 1;
export const CHECKIN_VALUE_MAX = 1000;
export const CHECKIN_NOTE_MAX = 500;

function toText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

// ---------------------------------------------------------------------------
// Habit create / edit input
// ---------------------------------------------------------------------------

export type HabitInput = {
  name: string;
  description: string;
  frequency: string;
  targetPerPeriod: string;
};

export type HabitField = keyof HabitInput;
export type HabitErrors = Partial<Record<HabitField, string>>;

export type RawHabitInput = {
  name?: unknown;
  description?: unknown;
  frequency?: unknown;
  targetPerPeriod?: unknown;
};

function toTargetPerPeriod(value: unknown): number {
  const text = typeof value === "number" ? String(value) : toText(value).trim();
  if (text === "") return 1;
  if (!/^\d+$/.test(text)) return Number.NaN;
  return Number(text);
}

export function normalizeHabitInput(raw: RawHabitInput): HabitInput {
  return {
    name: toText(raw.name).trim(),
    description: toText(raw.description).trim(),
    frequency: toText(raw.frequency).trim(),
    targetPerPeriod: String(toTargetPerPeriod(raw.targetPerPeriod)),
  };
}

export function validateHabitInput(input: HabitInput): HabitErrors {
  const errors: HabitErrors = {};

  if (input.name.length < 1 || input.name.length > HABIT_NAME_MAX) {
    errors.name = `Name must be between 1 and ${HABIT_NAME_MAX} characters.`;
  }

  if (input.description.length > HABIT_DESCRIPTION_MAX) {
    errors.description = `Description must be ${HABIT_DESCRIPTION_MAX} characters or fewer.`;
  }

  if (!isHabitFrequency(input.frequency)) {
    errors.frequency = "Choose how often you want to repeat this.";
  }

  const target = Number(input.targetPerPeriod);
  if (
    !Number.isInteger(target) ||
    target < TARGET_PER_PERIOD_MIN ||
    target > TARGET_PER_PERIOD_MAX
  ) {
    errors.targetPerPeriod = `Choose a target between ${TARGET_PER_PERIOD_MIN} and ${TARGET_PER_PERIOD_MAX}.`;
  }

  return errors;
}

export function hasHabitErrors(errors: HabitErrors): boolean {
  return Object.keys(errors).length > 0;
}

export type HabitColumns = {
  name: string;
  description: string;
  frequency: HabitFrequency;
  target_per_period: number;
};

// Only call after validateHabitInput() has returned no errors.
export function habitColumns(input: HabitInput): HabitColumns {
  if (!isHabitFrequency(input.frequency)) {
    throw new Error("habitColumns received unvalidated input");
  }
  return {
    name: input.name.trim(),
    description: input.description.trim(),
    frequency: input.frequency,
    target_per_period: Number(input.targetPerPeriod),
  };
}

// ---------------------------------------------------------------------------
// Check-in input
// ---------------------------------------------------------------------------

export type CheckinInput = {
  value: number;
  note: string | null;
};

export type RawCheckinInput = {
  value?: unknown;
  note?: unknown;
};

/** Normalises a check-in form's raw value/note. An absent/blank value
 * defaults to 1 (a plain "done today" tap needs no numeric entry). */
export function normalizeCheckinInput(raw: RawCheckinInput): CheckinInput {
  const text = typeof raw.value === "number" ? String(raw.value) : toText(raw.value).trim();
  const value = text === "" ? 1 : /^\d+$/.test(text) ? Number(text) : Number.NaN;
  return { value, note: emptyToNull(toText(raw.note)) };
}

export function validateCheckinInput(input: CheckinInput): string | undefined {
  if (
    !Number.isInteger(input.value) ||
    input.value < CHECKIN_VALUE_MIN ||
    input.value > CHECKIN_VALUE_MAX
  ) {
    return `Choose a value between ${CHECKIN_VALUE_MIN} and ${CHECKIN_VALUE_MAX}.`;
  }
  if (input.note !== null && input.note.length > CHECKIN_NOTE_MAX) {
    return `Keep the note to ${CHECKIN_NOTE_MAX} characters or fewer.`;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// ID / date parsing
// ---------------------------------------------------------------------------

export function parseHabitId(raw: unknown): number | null {
  const text = typeof raw === "number" ? String(raw) : toText(raw).trim();
  if (!/^\d+$/.test(text)) return null;
  const id = Number(text);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/** Today's calendar date as "YYYY-MM-DD" (UTC). */
export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Parses a "YYYY-MM-DD" check-in date, or null for anything invalid/absent
 * (the caller then falls back to today). */
export function parseCheckinDate(raw: unknown): string | null {
  const text = toText(raw).trim();
  if (text === "" || !DATE_RE.test(text) || Number.isNaN(Date.parse(text))) {
    return null;
  }
  return text;
}
