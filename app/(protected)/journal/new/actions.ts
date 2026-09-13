"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCompletedProfile } from "@/src/lib/auth";
import {
  hasJournalErrors,
  journalColumns,
  normalizeJournalInput,
  validateJournalInput,
} from "@/src/lib/journal/journal-validation";
import {
  readJournalFormValues,
  type JournalFormState,
} from "@/src/lib/journal/journal-form-state";

export async function createJournalEntryAction(
  _previousState: JournalFormState,
  formData: FormData,
): Promise<JournalFormState> {
  const values = readJournalFormValues(formData);
  const input = normalizeJournalInput(values);

  const errors = validateJournalInput(input);
  if (hasJournalErrors(errors)) {
    return { errors, message: "Check the highlighted fields.", values };
  }

  const { supabase, userId } = await requireCompletedProfile();

  // user_id comes only from the authenticated server context.
  // journalColumns() maps validated input to exactly the columns the INSERT
  // grant allows; id, created_at and updated_at are never set here. The
  // enforce_journal_entry_ownership() trigger re-checks goal_id / habit_id /
  // prime_assignment_id belong to this same user regardless of this form.
  const { data, error } = await supabase
    .from("journal_entries")
    .insert({ user_id: userId, ...journalColumns(input) })
    .select("id")
    .single();

  if (error) {
    console.error("Unable to create journal entry:", error.message);
    if (error.code === "23514") {
      return {
        errors: {},
        message: "Some details could not be saved. Review the form and try again.",
        values,
      };
    }
    if (error.code === "42501") {
      return {
        errors: {},
        message: "One of the linked items is not available. Check your selection.",
        values,
      };
    }
    return {
      errors: {},
      message: "We could not save this entry. Please try again.",
      values,
    };
  }

  revalidatePath("/journal");
  redirect(`/journal/${data.id}`);
}
