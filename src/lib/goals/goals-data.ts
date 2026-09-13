import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Goal, GoalMilestone } from "@/src/types/database";

// Typed reads for Goals. Every function takes a SupabaseClient<Database> (the
// existing Diong data-module convention). RLS already scopes goals /
// goal_milestones / journal_entries to their owner; these functions still
// pass an explicit userId and filter on it as defence in depth, matching
// src/lib/connections/connections-data.ts.

const GOAL_LIST_COLUMNS =
  "id, title, description, category, status, target_date, progress_percent, created_at, updated_at, completed_at";

export type GoalListItem = Omit<Goal, "user_id" | "description">;

/** All of the current user's goals, newest first. The caller groups them by
 * section (active / completed / paused+archived) via goalSection(). */
export async function listGoals(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<GoalListItem[]> {
  const { data, error } = await supabase
    .from("goals")
    .select(GOAL_LIST_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Unable to load goals:", error.message);
    return [];
  }

  return (data ?? []) as GoalListItem[];
}

export type LinkedJournalEntry = {
  id: number;
  title: string | null;
  entry_date: string;
};

export type GoalDetail = Omit<Goal, "user_id"> & {
  milestones: GoalMilestone[];
  journalEntries: LinkedJournalEntry[];
};

/** One goal the current user owns, with its milestones (position order) and
 * any journal entries linked to it, or null if it does not exist or belongs
 * to someone else. */
export async function getGoal(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: number,
): Promise<GoalDetail | null> {
  if (!Number.isSafeInteger(id) || id <= 0) return null;

  const { data: goal, error } = await supabase
    .from("goals")
    .select(
      "id, title, description, category, status, target_date, progress_percent, created_at, updated_at, completed_at",
    )
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Unable to load goal:", error.message);
    return null;
  }
  if (!goal) return null;

  const [{ data: milestones, error: milestonesError }, { data: entries, error: entriesError }] =
    await Promise.all([
      supabase
        .from("goal_milestones")
        .select("id, goal_id, user_id, title, position, is_completed, completed_at, created_at")
        .eq("user_id", userId)
        .eq("goal_id", id)
        .order("position", { ascending: true }),
      supabase
        .from("journal_entries")
        .select("id, title, entry_date")
        .eq("user_id", userId)
        .eq("goal_id", id)
        .order("entry_date", { ascending: false }),
    ]);

  if (milestonesError) {
    console.error("Unable to load goal milestones:", milestonesError.message);
  }
  if (entriesError) {
    console.error("Unable to load linked journal entries:", entriesError.message);
  }

  return {
    ...(goal as Omit<Goal, "user_id">),
    milestones: (milestones ?? []) as GoalMilestone[],
    journalEntries: (entries ?? []) as LinkedJournalEntry[],
  };
}

export type GoalOption = { id: number; title: string };

/** Lightweight goal list for the journal's "link to a goal" dropdown. */
export async function listGoalOptions(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<GoalOption[]> {
  const { data, error } = await supabase
    .from("goals")
    .select("id, title")
    .eq("user_id", userId)
    .neq("status", "archived")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Unable to load goal options:", error.message);
    return [];
  }

  return (data ?? []) as GoalOption[];
}
