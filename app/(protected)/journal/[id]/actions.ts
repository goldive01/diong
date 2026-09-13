"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/src/types/database";
import { requireCompletedProfile } from "@/src/lib/auth";
import {
  hasJournalErrors,
  journalColumns,
  normalizeJournalInput,
  validateJournalInput,
} from "@/src/lib/journal/journal-validation";
import {
  readJournalFormValues,
  type DeleteJournalEntryState,
  type JournalFormState,
} from "@/src/lib/journal/journal-form-state";

// Every export in this "use server" module is an async server action. Every
// entry-scoped action takes the entry id as a bound first argument supplied
// on the server — never a form field — and runs requireCompletedProfile()
// plus an explicit ownership check before touching a row.

const SAFE_UPDATE_MESSAGE = "We could not save your changes. Please try again.";
const SAFE_UNAVAILABLE_MESSAGE = "This entry is not available.";

function toSafeId(value: number): number | null {
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

async function ownsJournalEntry(
  supabase: SupabaseClient<Database>,
  userId: string,
  entryId: number,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("journal_entries")
    .select("id")
    .eq("user_id", userId)
    .eq("id", entryId)
    .maybeSingle();

  if (error) {
    console.error("Journal entry ownership check failed:", error.message);
    return false;
  }
  return Boolean(data);
}

export async function updateJournalEntryAction(
  entryId: number,
  _previousState: JournalFormState,
  formData: FormData,
): Promise<JournalFormState> {
  const values = readJournalFormValues(formData);
  const input = normalizeJournalInput(values);

  const errors = validateJournalInput(input);
  if (hasJournalErrors(errors)) {
    return { errors, message: "Check the highlighted fields.", values };
  }

  const id = toSafeId(entryId);
  if (id === null) {
    return { errors: {}, message: SAFE_UNAVAILABLE_MESSAGE, values };
  }

  const { supabase, userId } = await requireCompletedProfile();
  if (!(await ownsJournalEntry(supabase, userId, id))) {
    return { errors: {}, message: SAFE_UNAVAILABLE_MESSAGE, values };
  }

  const { error } = await supabase
    .from("journal_entries")
    .update(journalColumns(input))
    .eq("user_id", userId)
    .eq("id", id);

  if (error) {
    console.error("Unable to update journal entry:", error.message);
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
    return { errors: {}, message: SAFE_UPDATE_MESSAGE, values };
  }

  revalidatePath("/journal");
  revalidatePath(`/journal/${id}`);
  redirect(`/journal/${id}`);
}

/**
 * Hard delete — owner only, always behind an explicit confirmation in the
 * UI. Acceptable for journal entries specifically because nothing else in
 * Diong references a journal entry (no streak, no milestone count, no
 * downstream row) that a delete could silently corrupt; see
 * docs/GOALS_HABITS_JOURNAL.md.
 */
export async function deleteJournalEntryAction(
  entryId: number,
): Promise<DeleteJournalEntryState> {
  const id = toSafeId(entryId);
  if (id === null) {
    return { status: "error", message: SAFE_UNAVAILABLE_MESSAGE };
  }

  const { supabase, userId } = await requireCompletedProfile();
  if (!(await ownsJournalEntry(supabase, userId, id))) {
    return { status: "error", message: SAFE_UNAVAILABLE_MESSAGE };
  }

  const { error } = await supabase
    .from("journal_entries")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);

  if (error) {
    console.error("Unable to delete journal entry:", error.message);
    return { status: "error", message: SAFE_UPDATE_MESSAGE };
  }

  revalidatePath("/journal");
  redirect("/journal");
}
