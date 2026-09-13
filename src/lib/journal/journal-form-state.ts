import type { JournalErrors } from "./journal-validation";

// Plain (non-"use server") module. Holds the shared form value/state shapes
// and FormData readers used by both the journal server actions and the
// client forms.

export type JournalFormValues = {
  title: string;
  body: string;
  mood: string;
  entryDate: string;
  goalId: string;
  habitId: string;
  primeAssignmentId: string;
};

export function emptyJournalForm(entryDate: string): JournalFormValues {
  return {
    title: "",
    body: "",
    mood: "",
    entryDate,
    goalId: "",
    habitId: "",
    primeAssignmentId: "",
  };
}

export type JournalFormState = {
  errors: JournalErrors;
  message: string;
  values: JournalFormValues;
};

function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function readJournalFormValues(formData: FormData): JournalFormValues {
  return {
    title: readText(formData, "title"),
    body: readText(formData, "body"),
    mood: readText(formData, "mood"),
    entryDate: readText(formData, "entryDate"),
    goalId: readText(formData, "goalId"),
    habitId: readText(formData, "habitId"),
    primeAssignmentId: readText(formData, "primeAssignmentId"),
  };
}

// ---------------------------------------------------------------------------
// Delete confirmation
// ---------------------------------------------------------------------------

export type DeleteJournalEntryState = {
  status: "idle" | "error";
  message: string;
};

export const INITIAL_DELETE_JOURNAL_ENTRY_STATE: DeleteJournalEntryState = {
  status: "idle",
  message: "",
};
