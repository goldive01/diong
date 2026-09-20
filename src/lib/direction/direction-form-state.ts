import type { DirectionErrors } from "./direction-validation";

// Plain (non-"use server") module. Holds the shared form value/state shapes
// and FormData readers used by both the Daily Direction server actions and
// the client form. Runtime constants cannot be exported from a "use server"
// file. Mirrors src/lib/goals/goal-form-state.ts.

export type DirectionFormValues = {
  intention: string;
  desiredIdentity: string;
  primaryAction: string;
  whyItMatters: string;
  goalId: string;
  habitId: string;
};

export const EMPTY_DIRECTION_FORM: DirectionFormValues = {
  intention: "",
  desiredIdentity: "",
  primaryAction: "",
  whyItMatters: "",
  goalId: "",
  habitId: "",
};

export type DirectionFormState = {
  errors: DirectionErrors;
  message: string;
  values: DirectionFormValues;
};

export const INITIAL_DIRECTION_FORM_STATE: DirectionFormState = {
  errors: {},
  message: "",
  values: EMPTY_DIRECTION_FORM,
};

function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function readDirectionFormValues(formData: FormData): DirectionFormValues {
  return {
    intention: readText(formData, "intention"),
    desiredIdentity: readText(formData, "desiredIdentity"),
    primaryAction: readText(formData, "primaryAction"),
    whyItMatters: readText(formData, "whyItMatters"),
    goalId: readText(formData, "goalId"),
    habitId: readText(formData, "habitId"),
  };
}

// ---------------------------------------------------------------------------
// Status action state (mark complete / mark skipped / reopen)
// ---------------------------------------------------------------------------

export type DirectionActionState = {
  status: "idle" | "error";
  message: string;
};

export const INITIAL_DIRECTION_ACTION_STATE: DirectionActionState = {
  status: "idle",
  message: "",
};
