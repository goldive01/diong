import type { SupabaseClient } from "@supabase/supabase-js";
import type { DailyDirection, Database } from "@/src/types/database";

// Typed reads for Daily Direction. Every function takes a
// SupabaseClient<Database> (the existing Diong data-module convention). RLS
// already scopes daily_directions to their owner; these functions still
// pass an explicit userId and filter on it as defence in depth, matching
// src/lib/goals/goals-data.ts and src/lib/habits/habits-data.ts.
//
// History is always bounded — never an unlimited read — matching
// RECENT_CHECKIN_LIMIT / RECENT_INTERACTION_LIMIT precedent.

/** How many rows the "recent directions" list on /direction shows. */
export const RECENT_DIRECTION_LIMIT = 14;

const DIRECTION_COLUMNS =
  "id, user_id, direction_date, intention, desired_identity, primary_action, why_it_matters, goal_id, habit_id, status, completed_at, created_at, updated_at";

/** The current user's Daily Direction for a given calendar date ("today",
 * injected by the caller so the read stays deterministic and testable), or
 * null if none has been set yet. */
export async function getDirectionForDate(
  supabase: SupabaseClient<Database>,
  userId: string,
  date: string,
): Promise<DailyDirection | null> {
  const { data, error } = await supabase
    .from("daily_directions")
    .select(DIRECTION_COLUMNS)
    .eq("user_id", userId)
    .eq("direction_date", date)
    .maybeSingle();

  if (error) {
    console.error("Unable to load Daily Direction:", error.message);
    return null;
  }
  return data as DailyDirection | null;
}

/** One Daily Direction the current user owns, by id, or null if it does not
 * exist or belongs to someone else. Used to resolve the edit form and to
 * confirm ownership before a status change. */
export async function getDirectionById(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: number,
): Promise<DailyDirection | null> {
  if (!Number.isSafeInteger(id) || id <= 0) return null;

  const { data, error } = await supabase
    .from("daily_directions")
    .select(DIRECTION_COLUMNS)
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Unable to load Daily Direction:", error.message);
    return null;
  }
  return data as DailyDirection | null;
}

export type RecentDirection = Pick<
  DailyDirection,
  "id" | "direction_date" | "intention" | "primary_action" | "status"
>;

/** The current user's most recent directions, newest first, bounded to
 * RECENT_DIRECTION_LIMIT rows — a short history, not a full archive/
 * analytics view. */
export async function listRecentDirections(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<RecentDirection[]> {
  const { data, error } = await supabase
    .from("daily_directions")
    .select("id, direction_date, intention, primary_action, status")
    .eq("user_id", userId)
    .order("direction_date", { ascending: false })
    .limit(RECENT_DIRECTION_LIMIT);

  if (error) {
    console.error("Unable to load recent directions:", error.message);
    return [];
  }
  return (data ?? []) as RecentDirection[];
}
