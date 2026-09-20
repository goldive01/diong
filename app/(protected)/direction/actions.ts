"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DailyDirectionStatus, Database } from "@/src/types/database";
import { requireCompletedProfile } from "@/src/lib/auth";
import { todayIsoDate } from "@/src/lib/app/date";
import {
  directionColumns,
  hasDirectionErrors,
  isDirectionEditableToday,
  normalizeDirectionInput,
  parseOptionalLinkId,
  validateDirectionInput,
} from "@/src/lib/direction/direction-validation";
import { isDirectionStatus } from "@/src/lib/direction/direction-vocab";
import {
  readDirectionFormValues,
  type DirectionActionState,
  type DirectionFormState,
} from "@/src/lib/direction/direction-form-state";

// Every export in this "use server" module is an async server action. Every
// direction-scoped action takes the direction id as a bound first argument
// supplied on the server — never a form field — and runs
// requireCompletedProfile() plus an explicit ownership check before
// touching a row. Mirrors app/(protected)/goals/[id]/actions.ts.

const SAFE_UPDATE_MESSAGE = "We could not save your changes. Please try again.";
const SAFE_UNAVAILABLE_MESSAGE = "This direction is not available.";
const SAFE_LINK_MESSAGE = "One of the linked items is not available. Check your selection.";

function toSafeId(value: number): number | null {
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

// Confirms both ownership and that the row is still today's direction —
// past directions are read-only (mirrors the database UPDATE policy's
// `direction_date = current_date` clause), so a crafted request naming a
// past direction's id must be rejected the same way an unowned id is.
async function ownsTodaysDirection(
  supabase: SupabaseClient<Database>,
  userId: string,
  directionId: number,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("daily_directions")
    .select("id, direction_date")
    .eq("user_id", userId)
    .eq("id", directionId)
    .maybeSingle();

  if (error) {
    console.error("Direction ownership check failed:", error.message);
    return false;
  }
  if (!data) return false;
  return isDirectionEditableToday(data.direction_date, todayIsoDate());
}

function revalidateDirection() {
  revalidatePath("/direction");
  revalidatePath("/home");
}

// ---------------------------------------------------------------------------
// Create today's direction
// ---------------------------------------------------------------------------

export async function createDirectionAction(
  _previousState: DirectionFormState,
  formData: FormData,
): Promise<DirectionFormState> {
  const values = readDirectionFormValues(formData);
  const input = normalizeDirectionInput(values);

  const errors = validateDirectionInput(input);
  if (hasDirectionErrors(errors)) {
    return { errors, message: "Check the highlighted fields.", values };
  }

  const { supabase, userId } = await requireCompletedProfile();
  const goalId = parseOptionalLinkId(values.goalId);
  const habitId = parseOptionalLinkId(values.habitId);

  // user_id comes only from the authenticated server context.
  // direction_date is never sent — it always takes the column default
  // (current_date). The enforce_daily_direction_ownership() trigger
  // re-checks goal_id / habit_id belong to this same user regardless of
  // this form.
  const { error } = await supabase.from("daily_directions").insert({
    user_id: userId,
    goal_id: goalId,
    habit_id: habitId,
    ...directionColumns(input),
  });

  if (error) {
    console.error("Unable to create Daily Direction:", error.message);
    if (error.code === "23505") {
      return {
        errors: {},
        message: "You've already set today's direction. Refresh to see it.",
        values,
      };
    }
    if (error.code === "23514") {
      return {
        errors: {},
        message: "Some details could not be saved. Review the form and try again.",
        values,
      };
    }
    if (error.code === "42501") {
      return { errors: {}, message: SAFE_LINK_MESSAGE, values };
    }
    return {
      errors: {},
      message: "We could not save your direction. Please try again.",
      values,
    };
  }

  revalidateDirection();
  redirect("/direction");
}

// ---------------------------------------------------------------------------
// Edit an owned direction (used to edit today's direction in place)
// ---------------------------------------------------------------------------

export async function updateDirectionAction(
  directionId: number,
  _previousState: DirectionFormState,
  formData: FormData,
): Promise<DirectionFormState> {
  const values = readDirectionFormValues(formData);
  const input = normalizeDirectionInput(values);

  const errors = validateDirectionInput(input);
  if (hasDirectionErrors(errors)) {
    return { errors, message: "Check the highlighted fields.", values };
  }

  const id = toSafeId(directionId);
  if (id === null) {
    return { errors: {}, message: SAFE_UNAVAILABLE_MESSAGE, values };
  }

  const { supabase, userId } = await requireCompletedProfile();
  if (!(await ownsTodaysDirection(supabase, userId, id))) {
    return { errors: {}, message: SAFE_UNAVAILABLE_MESSAGE, values };
  }

  const goalId = parseOptionalLinkId(values.goalId);
  const habitId = parseOptionalLinkId(values.habitId);

  const { error } = await supabase
    .from("daily_directions")
    .update({ goal_id: goalId, habit_id: habitId, ...directionColumns(input) })
    .eq("user_id", userId)
    .eq("id", id);

  if (error) {
    console.error("Unable to update Daily Direction:", error.message);
    if (error.code === "23514") {
      return {
        errors: {},
        message: "Some details could not be saved. Review the form and try again.",
        values,
      };
    }
    if (error.code === "42501") {
      return { errors: {}, message: SAFE_LINK_MESSAGE, values };
    }
    return { errors: {}, message: SAFE_UPDATE_MESSAGE, values };
  }

  revalidateDirection();
  redirect("/direction");
}

// ---------------------------------------------------------------------------
// Status: complete / skip / reopen
// ---------------------------------------------------------------------------

export async function setDirectionStatusAction(
  directionId: number,
  status: DailyDirectionStatus,
): Promise<DirectionActionState> {
  const id = toSafeId(directionId);
  if (id === null || !isDirectionStatus(status)) {
    return { status: "error", message: SAFE_UNAVAILABLE_MESSAGE };
  }

  const { supabase, userId } = await requireCompletedProfile();
  if (!(await ownsTodaysDirection(supabase, userId, id))) {
    return { status: "error", message: SAFE_UNAVAILABLE_MESSAGE };
  }

  // completed_at is applied by apply_direction_completion_status() in the
  // same statement; the client never sets it directly.
  const { error } = await supabase
    .from("daily_directions")
    .update({ status })
    .eq("user_id", userId)
    .eq("id", id);

  if (error) {
    console.error("Unable to change direction status:", error.message);
    return { status: "error", message: SAFE_UPDATE_MESSAGE };
  }

  revalidateDirection();
  return { status: "idle", message: "" };
}
