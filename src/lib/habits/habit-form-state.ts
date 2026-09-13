import type { HabitErrors } from "./habit-validation";

// Plain (non-"use server") module. Holds the shared form value/state shapes
// and FormData readers used by both the habits server actions and the
// client forms.

export type HabitFormValues = {
  name: string;
  description: string;
  frequency: string;
  targetPerPeriod: string;
};

export const EMPTY_HABIT_FORM: HabitFormValues = {
  name: "",
  description: "",
  frequency: "daily",
  targetPerPeriod: "1",
};

export type HabitFormState = {
  errors: HabitErrors;
  message: string;
  values: HabitFormValues;
};

export const INITIAL_HABIT_FORM_STATE: HabitFormState = {
  errors: {},
  message: "",
  values: EMPTY_HABIT_FORM,
};

function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function readHabitFormValues(formData: FormData): HabitFormValues {
  return {
    name: readText(formData, "name"),
    description: readText(formData, "description"),
    frequency: readText(formData, "frequency"),
    targetPerPeriod: readText(formData, "targetPerPeriod"),
  };
}

// ---------------------------------------------------------------------------
// Check-in / undo
// ---------------------------------------------------------------------------

export type CheckinFormState = {
  status: "idle" | "error";
  message: string;
};

export const INITIAL_CHECKIN_STATE: CheckinFormState = { status: "idle", message: "" };

// ---------------------------------------------------------------------------
// Archive / reactivate
// ---------------------------------------------------------------------------

export type HabitActiveState = {
  status: "idle" | "error";
  message: string;
};

export const INITIAL_HABIT_ACTIVE_STATE: HabitActiveState = { status: "idle", message: "" };
