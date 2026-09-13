import type { JournalMood } from "@/src/types/database";
import { isJournalMood } from "./journal-vocab";

// Pure normalisation and validation for the private Journal application
// layer. A usability layer for forms and server actions — it does NOT
// replace the database CHECK constraints or the
// enforce_journal_entry_ownership() trigger, which remain authoritative.

export const JOURNAL_TITLE_MAX = 200;
export const JOURNAL_BODY_MAX = 10000;

function toText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value: string): boolean {
  return DATE_RE.test(value) && !Number.isNaN(Date.parse(value));
}

// ---------------------------------------------------------------------------
// Entry create / edit input
// ---------------------------------------------------------------------------

export type JournalInput = {
  title: string;
  body: string;
  mood: string;
  entryDate: string;
  goalId: string;
  habitId: string;
  primeAssignmentId: string;
};

export type JournalField = keyof JournalInput;
export type JournalErrors = Partial<Record<JournalField, string>>;

export type RawJournalInput = {
  title?: unknown;
  body?: unknown;
  mood?: unknown;
  entryDate?: unknown;
  goalId?: unknown;
  habitId?: unknown;
  primeAssignmentId?: unknown;
};

/** Today's calendar date as "YYYY-MM-DD" (UTC), the same shape entry_date
 * and every linked-resource date field use throughout Diong. */
export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function normalizeJournalInput(raw: RawJournalInput): JournalInput {
  const entryDate = toText(raw.entryDate).trim();
  return {
    title: toText(raw.title).trim(),
    body: toText(raw.body).trim(),
    mood: toText(raw.mood).trim(),
    entryDate: entryDate === "" ? todayIsoDate() : entryDate,
    goalId: toText(raw.goalId).trim(),
    habitId: toText(raw.habitId).trim(),
    primeAssignmentId: toText(raw.primeAssignmentId).trim(),
  };
}

export function validateJournalInput(input: JournalInput): JournalErrors {
  const errors: JournalErrors = {};

  if (input.title.length > JOURNAL_TITLE_MAX) {
    errors.title = `Title must be ${JOURNAL_TITLE_MAX} characters or fewer.`;
  }

  if (input.body.length < 1 || input.body.length > JOURNAL_BODY_MAX) {
    errors.body = `Write between 1 and ${JOURNAL_BODY_MAX} characters.`;
  }

  if (input.mood !== "" && !isJournalMood(input.mood)) {
    errors.mood = "Choose a valid mood, or leave it blank.";
  }

  if (!isValidDate(input.entryDate)) {
    errors.entryDate = "Enter a valid date.";
  }

  if (input.goalId !== "" && parseLinkedId(input.goalId) === null) {
    errors.goalId = "Choose a valid goal, or leave it blank.";
  }
  if (input.habitId !== "" && parseLinkedId(input.habitId) === null) {
    errors.habitId = "Choose a valid habit, or leave it blank.";
  }
  if (
    input.primeAssignmentId !== "" &&
    parseLinkedId(input.primeAssignmentId) === null
  ) {
    errors.primeAssignmentId = "That Daily Prime link is invalid.";
  }

  return errors;
}

export function hasJournalErrors(errors: JournalErrors): boolean {
  return Object.keys(errors).length > 0;
}

export type JournalColumns = {
  title: string | null;
  body: string;
  mood: JournalMood | null;
  entry_date: string;
  goal_id: number | null;
  habit_id: number | null;
  prime_assignment_id: number | null;
};

// Only call after validateJournalInput() has returned no errors.
export function journalColumns(input: JournalInput): JournalColumns {
  return {
    title: emptyToNull(input.title),
    body: input.body.trim(),
    mood: isJournalMood(input.mood) ? input.mood : null,
    entry_date: input.entryDate,
    goal_id: parseLinkedId(input.goalId),
    habit_id: parseLinkedId(input.habitId),
    prime_assignment_id: parseLinkedId(input.primeAssignmentId),
  };
}

// ---------------------------------------------------------------------------
// ID / date parsing
// ---------------------------------------------------------------------------

/** Parses a journal entry id (route param), or null. */
export function parseJournalId(raw: unknown): number | null {
  const text = typeof raw === "number" ? String(raw) : toText(raw).trim();
  if (!/^\d+$/.test(text)) return null;
  const id = Number(text);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/** Parses an optional linked-resource id (goal/habit/Prime assignment).
 * Blank means "no link" (null); anything non-numeric or non-positive is
 * invalid (null) so the caller can flag it rather than silently drop it. */
export function parseLinkedId(raw: unknown): number | null {
  const text = typeof raw === "number" ? String(raw) : toText(raw).trim();
  if (text === "" || !/^\d+$/.test(text)) return null;
  const id = Number(text);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/** Parses a "YYYY-MM-DD" date filter/field value, or null when absent or
 * invalid. */
export function parseEntryDate(raw: unknown): string | null {
  const text = toText(raw).trim();
  if (text === "" || !isValidDate(text)) return null;
  return text;
}
