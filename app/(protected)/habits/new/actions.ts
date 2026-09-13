"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCompletedProfile } from "@/src/lib/auth";
import {
  habitColumns,
  hasHabitErrors,
  normalizeHabitInput,
  validateHabitInput,
} from "@/src/lib/habits/habit-validation";
import {
  readHabitFormValues,
  type HabitFormState,
} from "@/src/lib/habits/habit-form-state";

export async function createHabitAction(
  _previousState: HabitFormState,
  formData: FormData,
): Promise<HabitFormState> {
  const values = readHabitFormValues(formData);
  const input = normalizeHabitInput(values);

  const errors = validateHabitInput(input);
  if (hasHabitErrors(errors)) {
    return { errors, message: "Check the highlighted fields.", values };
  }

  const { supabase, userId } = await requireCompletedProfile();

  // user_id comes only from the authenticated server context. habitColumns()
  // returns exactly the columns the INSERT grant allows; id, created_at,
  // updated_at and archived_at are never set here — every new habit starts
  // active by column default.
  const { error } = await supabase
    .from("habits")
    .insert({ user_id: userId, ...habitColumns(input) });

  if (error) {
    console.error("Unable to create habit:", error.message);
    if (error.code === "23514") {
      return {
        errors: {},
        message: "Some details could not be saved. Review the form and try again.",
        values,
      };
    }
    return {
      errors: {},
      message: "We could not save this habit. Please try again.",
      values,
    };
  }

  revalidatePath("/habits");
  revalidatePath("/home");
  redirect("/habits");
}
