"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCompletedProfile } from "@/src/lib/auth";
import {
  goalColumns,
  hasGoalErrors,
  normalizeGoalInput,
  validateGoalInput,
} from "@/src/lib/goals/goal-validation";
import {
  readGoalFormValues,
  type GoalFormState,
} from "@/src/lib/goals/goal-form-state";

export async function createGoalAction(
  _previousState: GoalFormState,
  formData: FormData,
): Promise<GoalFormState> {
  const values = readGoalFormValues(formData);
  const input = normalizeGoalInput(values);

  const errors = validateGoalInput(input);
  if (hasGoalErrors(errors)) {
    return { errors, message: "Check the highlighted fields.", values };
  }

  const { supabase, userId } = await requireCompletedProfile();

  // user_id comes only from the authenticated server context. goalColumns()
  // returns exactly the columns the INSERT grant allows; id, created_at,
  // updated_at, completed_at, status and progress_percent are never set
  // here — every new goal starts 'active' at 0% by column default.
  const { error } = await supabase
    .from("goals")
    .insert({ user_id: userId, ...goalColumns(input) });

  if (error) {
    console.error("Unable to create goal:", error.message);
    if (error.code === "23514") {
      return {
        errors: {},
        message: "Some details could not be saved. Review the form and try again.",
        values,
      };
    }
    return {
      errors: {},
      message: "We could not save this goal. Please try again.",
      values,
    };
  }

  revalidatePath("/goals");
  revalidatePath("/home");
  redirect("/goals");
}
