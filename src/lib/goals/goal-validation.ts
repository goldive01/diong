// Pure normalisation and validation for the Goals application layer. A
// usability layer for forms and server actions — it does NOT replace the
// database CHECK constraints or the add_goal_milestone() /
// toggle_goal_milestone() RPC checks, which remain authoritative.

export const GOAL_TITLE_MAX = 120;
export const GOAL_DESCRIPTION_MAX = 3000;
export const GOAL_CATEGORY_MAX = 60;
export const MILESTONE_TITLE_MAX = 200;

function toText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

// ---------------------------------------------------------------------------
// Goal create / edit input
// ---------------------------------------------------------------------------

export type GoalInput = {
  title: string;
  description: string;
  category: string;
  targetDate: string;
};

export type GoalField = keyof GoalInput;
export type GoalErrors = Partial<Record<GoalField, string>>;

export type RawGoalInput = {
  title?: unknown;
  description?: unknown;
  category?: unknown;
  targetDate?: unknown;
};

export function normalizeGoalInput(raw: RawGoalInput): GoalInput {
  return {
    title: toText(raw.title).trim(),
    description: toText(raw.description).trim(),
    category: toText(raw.category).trim(),
    targetDate: toText(raw.targetDate).trim(),
  };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validateGoalInput(input: GoalInput): GoalErrors {
  const errors: GoalErrors = {};

  if (input.title.length < 1 || input.title.length > GOAL_TITLE_MAX) {
    errors.title = `Title must be between 1 and ${GOAL_TITLE_MAX} characters.`;
  }

  if (input.description.length > GOAL_DESCRIPTION_MAX) {
    errors.description = `Description must be ${GOAL_DESCRIPTION_MAX} characters or fewer.`;
  }

  if (input.category.length > GOAL_CATEGORY_MAX) {
    errors.category = `Category must be ${GOAL_CATEGORY_MAX} characters or fewer.`;
  }

  if (input.targetDate !== "") {
    if (!DATE_RE.test(input.targetDate) || Number.isNaN(Date.parse(input.targetDate))) {
      errors.targetDate = "Enter a valid date.";
    }
  }

  return errors;
}

export function hasGoalErrors(errors: GoalErrors): boolean {
  return Object.keys(errors).length > 0;
}

export type GoalColumns = {
  title: string;
  description: string;
  category: string | null;
  target_date: string | null;
};

// Only call after validateGoalInput() has returned no errors.
export function goalColumns(input: GoalInput): GoalColumns {
  return {
    title: input.title.trim(),
    description: input.description.trim(),
    category: emptyToNull(input.category),
    target_date: input.targetDate === "" ? null : input.targetDate,
  };
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

/** Parses a progress percent from a form field. NaN signals "invalid". */
export function parseProgressPercent(value: unknown): number {
  const text = typeof value === "number" ? String(value) : toText(value).trim();
  if (text === "" || !/^\d+$/.test(text)) return Number.NaN;
  return Number(text);
}

export function validateProgressPercent(value: number): string | undefined {
  if (!Number.isInteger(value) || value < 0 || value > 100) {
    return "Choose a progress value between 0 and 100.";
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Milestones
// ---------------------------------------------------------------------------

export function normalizeMilestoneTitle(value: unknown): string {
  return toText(value).trim();
}

export function validateMilestoneTitle(title: string): string | undefined {
  if (title.length < 1 || title.length > MILESTONE_TITLE_MAX) {
    return `Title must be between 1 and ${MILESTONE_TITLE_MAX} characters.`;
  }
  return undefined;
}

export type MilestoneLike = { is_completed: boolean };

/**
 * The "set progress from completed milestones" helper. Pure and explicit —
 * never invoked automatically. Rounds to the nearest integer percent; 0 when
 * there are no milestones (nothing to derive from).
 */
export function progressFromMilestones(
  milestones: readonly MilestoneLike[],
): number {
  if (milestones.length === 0) return 0;
  const completed = milestones.filter((m) => m.is_completed).length;
  return Math.round((completed / milestones.length) * 100);
}

// ---------------------------------------------------------------------------
// ID parsing
// ---------------------------------------------------------------------------

/** Parses a route param / bound id into a safe positive integer, or null. */
export function parseGoalId(raw: unknown): number | null {
  const text = typeof raw === "number" ? String(raw) : toText(raw).trim();
  if (!/^\d+$/.test(text)) return null;
  const id = Number(text);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
