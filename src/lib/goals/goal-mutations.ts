import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/src/types/database";

// Typed wrappers around the two goal_milestones RPCs. Application code must
// never write public.goal_milestones directly — there is no INSERT/UPDATE
// grant on it at all. These wrappers map the known SQLSTATEs to a small
// controlled result and never surface raw Postgres text.

export type MutationReason = "not_available" | "invalid" | "unknown";

export type MutationResult<T = void> =
  | { status: "success"; data: T }
  | { status: "error"; reason: MutationReason };

function classify(code: string | undefined): MutationReason {
  if (code === "42501") return "not_available";
  if (code === "22023" || code === "23514" || code === "23503") return "invalid";
  return "unknown";
}

export async function addGoalMilestone(
  supabase: SupabaseClient<Database>,
  goalId: number,
  title: string,
): Promise<MutationResult<number>> {
  const { data, error } = await supabase.rpc("add_goal_milestone", {
    p_goal_id: goalId,
    p_title: title,
  });
  if (!error) return { status: "success", data: data as number };
  if (classify(error.code) === "unknown") {
    console.error("add_goal_milestone failed:", error.message);
  }
  return { status: "error", reason: classify(error.code) };
}

export async function toggleGoalMilestone(
  supabase: SupabaseClient<Database>,
  milestoneId: number,
): Promise<MutationResult<{ isCompleted: boolean }>> {
  const { data, error } = await supabase.rpc("toggle_goal_milestone", {
    p_milestone_id: milestoneId,
  });
  if (!error) {
    const row = data?.[0];
    return { status: "success", data: { isCompleted: row?.is_completed ?? false } };
  }
  if (classify(error.code) === "unknown") {
    console.error("toggle_goal_milestone failed:", error.message);
  }
  return { status: "error", reason: classify(error.code) };
}
