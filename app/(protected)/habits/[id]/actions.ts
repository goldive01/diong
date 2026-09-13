"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/src/types/database";
import { requireCompletedProfile } from "@/src/lib/auth";
import {
  habitColumns,
  hasHabitErrors,
  normalizeCheckinInput,
  normalizeHabitInput,
  parseCheckinDate,
  validateCheckinInput,
  validateHabitInput,
} from "@/src/lib/habits/habit-validation";
import { checkInHabit, undoHabitCheckin } from "@/src/lib/habits/habit-mutations";
import { habitErrorMessage } from "@/src/lib/habits/habit-labels";
import {
  readHabitFormValues,
  type CheckinFormState,
  type HabitActiveState,
  type HabitFormState,
} from "@/src/lib/habits/habit-form-state";

// Every export in this "use server" module is an async server action. Every
// habit-scoped action takes the habit id as a bound first argument supplied
// on the server — never a form field — and runs requireCompletedProfile()
// plus an explicit ownership check before touching a row.

const SAFE_UPDATE_MESSAGE = "We could not save your changes. Please try again.";
const SAFE_UNAVAILABLE_MESSAGE = "This habit is not available.";

function toSafeId(value: number): number | null {
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

async function ownsHabit(
  supabase: SupabaseClient<Database>,
  userId: string,
  habitId: number,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("habits")
    .select("id")
    .eq("user_id", userId)
    .eq("id", habitId)
    .maybeSingle();

  if (error) {
    console.error("Habit ownership check failed:", error.message);
    return false;
  }
  return Boolean(data);
}

function revalidateHabit(id: number) {
  revalidatePath("/habits");
  revalidatePath(`/habits/${id}`);
  revalidatePath("/home");
}

// ---------------------------------------------------------------------------
// Edit habit
// ---------------------------------------------------------------------------

export async function updateHabitAction(
  habitId: number,
  _previousState: HabitFormState,
  formData: FormData,
): Promise<HabitFormState> {
  const values = readHabitFormValues(formData);
  const input = normalizeHabitInput(values);

  const errors = validateHabitInput(input);
  if (hasHabitErrors(errors)) {
    return { errors, message: "Check the highlighted fields.", values };
  }

  const id = toSafeId(habitId);
  if (id === null) {
    return { errors: {}, message: SAFE_UNAVAILABLE_MESSAGE, values };
  }

  const { supabase, userId } = await requireCompletedProfile();
  if (!(await ownsHabit(supabase, userId, id))) {
    return { errors: {}, message: SAFE_UNAVAILABLE_MESSAGE, values };
  }

  const columns = habitColumns(input);
  const { error } = await supabase
    .from("habits")
    .update({
      name: columns.name,
      description: columns.description,
      frequency: columns.frequency,
      target_per_period: columns.target_per_period,
    })
    .eq("user_id", userId)
    .eq("id", id);

  if (error) {
    console.error("Unable to update habit:", error.message);
    if (error.code === "23514") {
      return {
        errors: {},
        message: "Some details could not be saved. Review the form and try again.",
        values,
      };
    }
    return { errors: {}, message: SAFE_UPDATE_MESSAGE, values };
  }

  revalidateHabit(id);
  redirect(`/habits/${id}`);
}

// ---------------------------------------------------------------------------
// Check in / undo
// ---------------------------------------------------------------------------

export async function checkInHabitAction(
  habitId: number,
  _previousState: CheckinFormState,
  formData: FormData,
): Promise<CheckinFormState> {
  const id = toSafeId(habitId);
  if (id === null) {
    return { status: "error", message: SAFE_UNAVAILABLE_MESSAGE };
  }

  const input = normalizeCheckinInput({
    value: formData.get("value"),
    note: formData.get("note"),
  });
  const fieldError = validateCheckinInput(input);
  if (fieldError) {
    return { status: "error", message: fieldError };
  }

  const checkinDate = parseCheckinDate(formData.get("checkinDate"));

  const { supabase } = await requireCompletedProfile();
  const result = await checkInHabit(supabase, {
    habitId: id,
    checkinDate,
    value: input.value,
    note: input.note,
  });

  if (result.status === "error") {
    return { status: "error", message: habitErrorMessage(result.reason) };
  }

  revalidateHabit(id);
  return { status: "idle", message: "" };
}

export async function undoHabitCheckinAction(
  habitId: number,
  checkinDate?: string,
): Promise<CheckinFormState> {
  const id = toSafeId(habitId);
  if (id === null) {
    return { status: "error", message: SAFE_UNAVAILABLE_MESSAGE };
  }

  const { supabase } = await requireCompletedProfile();
  const result = await undoHabitCheckin(supabase, id, checkinDate ?? null);

  if (result.status === "error") {
    return { status: "error", message: habitErrorMessage(result.reason) };
  }

  revalidateHabit(id);
  return { status: "idle", message: "" };
}

// ---------------------------------------------------------------------------
// Archive / reactivate
// ---------------------------------------------------------------------------

async function setHabitActive(
  habitId: number,
  nextActive: boolean,
): Promise<HabitActiveState> {
  const id = toSafeId(habitId);
  if (id === null) {
    return { status: "error", message: SAFE_UNAVAILABLE_MESSAGE };
  }

  const { supabase, userId } = await requireCompletedProfile();
  if (!(await ownsHabit(supabase, userId, id))) {
    return { status: "error", message: SAFE_UNAVAILABLE_MESSAGE };
  }

  // archived_at is applied by apply_habit_archived_at() in the same
  // statement; the client never sets it directly.
  const { error } = await supabase
    .from("habits")
    .update({ is_active: nextActive })
    .eq("user_id", userId)
    .eq("id", id);

  if (error) {
    console.error("Unable to change habit active state:", error.message);
    return { status: "error", message: SAFE_UPDATE_MESSAGE };
  }

  revalidateHabit(id);
  return { status: "idle", message: "" };
}

export async function archiveHabitAction(habitId: number): Promise<HabitActiveState> {
  return setHabitActive(habitId, false);
}

export async function reactivateHabitAction(habitId: number): Promise<HabitActiveState> {
  return setHabitActive(habitId, true);
}
