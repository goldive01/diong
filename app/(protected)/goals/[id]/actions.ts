"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, GoalStatus } from "@/src/types/database";
import { requireCompletedProfile } from "@/src/lib/auth";
import {
  goalColumns,
  hasGoalErrors,
  normalizeGoalInput,
  normalizeMilestoneTitle,
  parseProgressPercent,
  progressFromMilestones,
  validateGoalInput,
  validateMilestoneTitle,
  validateProgressPercent,
} from "@/src/lib/goals/goal-validation";
import { isGoalStatus } from "@/src/lib/goals/goal-vocab";
import { addGoalMilestone, toggleGoalMilestone } from "@/src/lib/goals/goal-mutations";
import { goalErrorMessage } from "@/src/lib/goals/goal-labels";
import {
  readGoalFormValues,
  type AddMilestoneState,
  type GoalActionState,
  type GoalFormState,
} from "@/src/lib/goals/goal-form-state";

// Every export in this "use server" module is an async server action. Every
// goal-scoped action takes the goal id as a bound first argument supplied on
// the server — never a form field — and runs requireCompletedProfile() plus
// an explicit ownership check before touching a row.

const SAFE_UPDATE_MESSAGE = "We could not save your changes. Please try again.";
const SAFE_UNAVAILABLE_MESSAGE = "This goal is not available.";

function toSafeId(value: number): number | null {
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

async function ownsGoal(
  supabase: SupabaseClient<Database>,
  userId: string,
  goalId: number,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("goals")
    .select("id")
    .eq("user_id", userId)
    .eq("id", goalId)
    .maybeSingle();

  if (error) {
    console.error("Goal ownership check failed:", error.message);
    return false;
  }
  return Boolean(data);
}

// ---------------------------------------------------------------------------
// Edit goal
// ---------------------------------------------------------------------------

export async function updateGoalAction(
  goalId: number,
  _previousState: GoalFormState,
  formData: FormData,
): Promise<GoalFormState> {
  const values = readGoalFormValues(formData);
  const input = normalizeGoalInput(values);

  const errors = validateGoalInput(input);
  if (hasGoalErrors(errors)) {
    return { errors, message: "Check the highlighted fields.", values };
  }

  const id = toSafeId(goalId);
  if (id === null) {
    return { errors: {}, message: SAFE_UNAVAILABLE_MESSAGE, values };
  }

  const { supabase, userId } = await requireCompletedProfile();
  if (!(await ownsGoal(supabase, userId, id))) {
    return { errors: {}, message: SAFE_UNAVAILABLE_MESSAGE, values };
  }

  // Only the four editable detail columns are written here. status and
  // progress_percent are left to the dedicated status/progress actions.
  const columns = goalColumns(input);
  const { error } = await supabase
    .from("goals")
    .update({
      title: columns.title,
      description: columns.description,
      category: columns.category,
      target_date: columns.target_date,
    })
    .eq("user_id", userId)
    .eq("id", id);

  if (error) {
    console.error("Unable to update goal:", error.message);
    if (error.code === "23514") {
      return {
        errors: {},
        message: "Some details could not be saved. Review the form and try again.",
        values,
      };
    }
    return { errors: {}, message: SAFE_UPDATE_MESSAGE, values };
  }

  revalidatePath("/goals");
  revalidatePath(`/goals/${id}`);
  redirect(`/goals/${id}`);
}

// ---------------------------------------------------------------------------
// Status: pause / resume / complete / archive / reopen
// ---------------------------------------------------------------------------

function revalidateGoal(id: number) {
  revalidatePath("/goals");
  revalidatePath(`/goals/${id}`);
  revalidatePath("/home");
}

export async function setGoalStatusAction(
  goalId: number,
  status: GoalStatus,
): Promise<GoalActionState> {
  const id = toSafeId(goalId);
  if (id === null || !isGoalStatus(status)) {
    return { status: "error", message: SAFE_UNAVAILABLE_MESSAGE };
  }

  const { supabase, userId } = await requireCompletedProfile();
  if (!(await ownsGoal(supabase, userId, id))) {
    return { status: "error", message: SAFE_UNAVAILABLE_MESSAGE };
  }

  // completed_at / progress_percent-on-complete are applied by
  // apply_goal_completion_status() in the same statement; the client never
  // sets either directly.
  const { error } = await supabase
    .from("goals")
    .update({ status })
    .eq("user_id", userId)
    .eq("id", id);

  if (error) {
    console.error("Unable to change goal status:", error.message);
    return { status: "error", message: SAFE_UPDATE_MESSAGE };
  }

  revalidateGoal(id);
  return { status: "idle", message: "" };
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

export async function setGoalProgressAction(
  goalId: number,
  _previousState: GoalActionState,
  formData: FormData,
): Promise<GoalActionState> {
  const id = toSafeId(goalId);
  if (id === null) {
    return { status: "error", message: SAFE_UNAVAILABLE_MESSAGE };
  }

  const percent = parseProgressPercent(formData.get("progressPercent"));
  const fieldError = validateProgressPercent(percent);
  if (fieldError) {
    return { status: "error", message: fieldError };
  }

  const { supabase, userId } = await requireCompletedProfile();
  if (!(await ownsGoal(supabase, userId, id))) {
    return { status: "error", message: SAFE_UNAVAILABLE_MESSAGE };
  }

  const { error } = await supabase
    .from("goals")
    .update({ progress_percent: percent })
    .eq("user_id", userId)
    .eq("id", id);

  if (error) {
    console.error("Unable to update goal progress:", error.message);
    if (error.code === "23514") {
      return {
        status: "error",
        message: "Reopen this goal before changing its progress.",
      };
    }
    return { status: "error", message: SAFE_UPDATE_MESSAGE };
  }

  revalidateGoal(id);
  return { status: "idle", message: "" };
}

/** "Set progress from completed milestones" — an explicit, one-time helper.
 * Never invoked automatically; the caller (a dedicated button) always fires
 * it deliberately. */
export async function setGoalProgressFromMilestonesAction(
  goalId: number,
): Promise<GoalActionState> {
  const id = toSafeId(goalId);
  if (id === null) {
    return { status: "error", message: SAFE_UNAVAILABLE_MESSAGE };
  }

  const { supabase, userId } = await requireCompletedProfile();
  if (!(await ownsGoal(supabase, userId, id))) {
    return { status: "error", message: SAFE_UNAVAILABLE_MESSAGE };
  }

  const { data: milestones, error: milestonesError } = await supabase
    .from("goal_milestones")
    .select("is_completed")
    .eq("user_id", userId)
    .eq("goal_id", id);

  if (milestonesError) {
    console.error("Unable to load milestones:", milestonesError.message);
    return { status: "error", message: SAFE_UPDATE_MESSAGE };
  }
  if (!milestones || milestones.length === 0) {
    return { status: "error", message: "Add a milestone first." };
  }

  const percent = progressFromMilestones(milestones);
  const { error } = await supabase
    .from("goals")
    .update({ progress_percent: percent })
    .eq("user_id", userId)
    .eq("id", id);

  if (error) {
    console.error("Unable to update goal progress:", error.message);
    if (error.code === "23514") {
      return {
        status: "error",
        message: "Reopen this goal before changing its progress.",
      };
    }
    return { status: "error", message: SAFE_UPDATE_MESSAGE };
  }

  revalidateGoal(id);
  return { status: "idle", message: "" };
}

// ---------------------------------------------------------------------------
// Milestones
// ---------------------------------------------------------------------------

export async function addMilestoneAction(
  goalId: number,
  _previousState: AddMilestoneState,
  formData: FormData,
): Promise<AddMilestoneState> {
  const title = normalizeMilestoneTitle(formData.get("title"));
  const fieldError = validateMilestoneTitle(title);
  if (fieldError) {
    return { status: "error", message: fieldError };
  }

  const id = toSafeId(goalId);
  if (id === null) {
    return { status: "error", message: SAFE_UNAVAILABLE_MESSAGE };
  }

  const { supabase } = await requireCompletedProfile();
  const result = await addGoalMilestone(supabase, id, title);

  if (result.status === "error") {
    return { status: "error", message: goalErrorMessage(result.reason) };
  }

  revalidateGoal(id);
  return { status: "idle", message: "" };
}

export async function toggleMilestoneAction(
  goalId: number,
  milestoneId: number,
): Promise<GoalActionState> {
  const id = toSafeId(goalId);
  const mId = toSafeId(milestoneId);
  if (id === null || mId === null) {
    return { status: "error", message: SAFE_UNAVAILABLE_MESSAGE };
  }

  const { supabase } = await requireCompletedProfile();
  const result = await toggleGoalMilestone(supabase, mId);

  if (result.status === "error") {
    return { status: "error", message: goalErrorMessage(result.reason) };
  }

  revalidateGoal(id);
  return { status: "idle", message: "" };
}
