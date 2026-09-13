import type { GoalErrors } from "./goal-validation";

// Plain (non-"use server") module. Holds the shared form value/state shapes
// and FormData readers used by both the goals server actions and the client
// forms. Runtime constants cannot be exported from a "use server" file.

export type GoalFormValues = {
  title: string;
  description: string;
  category: string;
  targetDate: string;
};

export const EMPTY_GOAL_FORM: GoalFormValues = {
  title: "",
  description: "",
  category: "",
  targetDate: "",
};

export type GoalFormState = {
  errors: GoalErrors;
  message: string;
  values: GoalFormValues;
};

export const INITIAL_GOAL_FORM_STATE: GoalFormState = {
  errors: {},
  message: "",
  values: EMPTY_GOAL_FORM,
};

function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function readGoalFormValues(formData: FormData): GoalFormValues {
  return {
    title: readText(formData, "title"),
    description: readText(formData, "description"),
    category: readText(formData, "category"),
    targetDate: readText(formData, "targetDate"),
  };
}

// ---------------------------------------------------------------------------
// Add-milestone form
// ---------------------------------------------------------------------------

export type AddMilestoneState = {
  status: "idle" | "error";
  message: string;
};

export const INITIAL_ADD_MILESTONE_STATE: AddMilestoneState = {
  status: "idle",
  message: "",
};

// ---------------------------------------------------------------------------
// Simple action state shared by status changes / progress / milestone toggle
// ---------------------------------------------------------------------------

export type GoalActionState = {
  status: "idle" | "error";
  message: string;
};

export const INITIAL_GOAL_ACTION_STATE: GoalActionState = {
  status: "idle",
  message: "",
};
