import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/src/types/database";

// Typed wrappers around the two habit_checkins RPCs. Application code must
// never write public.habit_checkins directly — there is no INSERT/UPDATE
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

export async function checkInHabit(
  supabase: SupabaseClient<Database>,
  input: { habitId: number; checkinDate?: string | null; value: number; note: string | null },
): Promise<MutationResult<{ checkinDate: string }>> {
  const { data, error } = await supabase.rpc("check_in_habit", {
    p_habit_id: input.habitId,
    p_checkin_date: input.checkinDate ?? undefined,
    p_value: input.value,
    p_note: input.note,
  });
  if (!error) {
    const row = data?.[0];
    return { status: "success", data: { checkinDate: row?.checkin_date ?? "" } };
  }
  if (classify(error.code) === "unknown") {
    console.error("check_in_habit failed:", error.message);
  }
  return { status: "error", reason: classify(error.code) };
}

export async function undoHabitCheckin(
  supabase: SupabaseClient<Database>,
  habitId: number,
  checkinDate?: string | null,
): Promise<MutationResult> {
  const { error } = await supabase.rpc("undo_habit_checkin", {
    p_habit_id: habitId,
    p_checkin_date: checkinDate ?? undefined,
  });
  if (!error) return { status: "success", data: undefined };
  if (classify(error.code) === "unknown") {
    console.error("undo_habit_checkin failed:", error.message);
  }
  return { status: "error", reason: classify(error.code) };
}
