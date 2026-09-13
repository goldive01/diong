import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Habit, HabitCheckin } from "@/src/types/database";
import { calculateHabitStreak, type HabitStreak } from "./habit-streak";

// Typed reads for Habits. Every function takes a SupabaseClient<Database>
// (the existing Diong data-module convention). RLS already scopes habits /
// habit_checkins to their owner; these functions still pass an explicit
// userId and filter on it as defence in depth, matching
// src/lib/connections/connections-data.ts.
//
// Check-in history is always bounded — never an unlimited read — matching
// interaction-history.tsx's RECENT_INTERACTION_LIMIT precedent for
// Connections.

/** How far back streak calculation and history look. 180 days comfortably
 * covers a long daily streak and ~25 weekly periods without an unbounded
 * read. */
const HISTORY_WINDOW_DAYS = 180;
/** How many check-ins the detail page's visible history list shows. */
export const RECENT_CHECKIN_LIMIT = 30;

function cutoffDate(today: string): string {
  const parsed = new Date(`${today}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return today;
  parsed.setUTCDate(parsed.getUTCDate() - HISTORY_WINDOW_DAYS);
  return parsed.toISOString().slice(0, 10);
}

export type HabitListItem = Omit<Habit, "user_id" | "description"> & {
  streak: HabitStreak;
  checkedInToday: boolean;
};

/** Every habit the user owns (active and archived), with a bounded streak
 * computed per habit. `today` is an injected "YYYY-MM-DD" calendar date so
 * the calculation stays deterministic and testable. */
export async function listHabits(
  supabase: SupabaseClient<Database>,
  userId: string,
  today: string,
): Promise<HabitListItem[]> {
  const { data: habits, error } = await supabase
    .from("habits")
    .select(
      "id, name, frequency, target_per_period, is_active, created_at, updated_at, archived_at",
    )
    .eq("user_id", userId)
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Unable to load habits:", error.message);
    return [];
  }
  if (!habits || habits.length === 0) return [];

  const ids = habits.map((h) => h.id);
  const { data: checkins, error: checkinsError } = await supabase
    .from("habit_checkins")
    .select("habit_id, checkin_date, value")
    .eq("user_id", userId)
    .in("habit_id", ids)
    .gte("checkin_date", cutoffDate(today));

  if (checkinsError) {
    console.error("Unable to load habit check-ins:", checkinsError.message);
  }

  const byHabit = new Map<number, { checkinDate: string; value: number }[]>();
  for (const row of checkins ?? []) {
    const list = byHabit.get(row.habit_id) ?? [];
    list.push({ checkinDate: row.checkin_date, value: row.value });
    byHabit.set(row.habit_id, list);
  }

  return (habits as Omit<Habit, "user_id" | "description">[]).map((habit) => {
    const habitCheckins = byHabit.get(habit.id) ?? [];
    return {
      ...habit,
      streak: calculateHabitStreak(
        habitCheckins,
        habit.frequency,
        habit.target_per_period,
        today,
      ),
      checkedInToday: habitCheckins.some((c) => c.checkinDate === today),
    };
  });
}

export type HabitDetail = Omit<Habit, "user_id"> & {
  streak: HabitStreak;
  checkedInToday: boolean;
  recentCheckins: Pick<HabitCheckin, "checkin_date" | "value" | "note">[];
};

/** One habit the current user owns, with its bounded streak and recent
 * check-in history, or null if it does not exist or belongs to someone
 * else. */
export async function getHabit(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: number,
  today: string,
): Promise<HabitDetail | null> {
  if (!Number.isSafeInteger(id) || id <= 0) return null;

  const { data: habit, error } = await supabase
    .from("habits")
    .select(
      "id, name, description, frequency, target_per_period, is_active, created_at, updated_at, archived_at",
    )
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Unable to load habit:", error.message);
    return null;
  }
  if (!habit) return null;

  const { data: checkins, error: checkinsError } = await supabase
    .from("habit_checkins")
    .select("checkin_date, value, note")
    .eq("user_id", userId)
    .eq("habit_id", id)
    .gte("checkin_date", cutoffDate(today))
    .order("checkin_date", { ascending: false });

  if (checkinsError) {
    console.error("Unable to load habit check-ins:", checkinsError.message);
  }

  const rows = (checkins ?? []) as Pick<HabitCheckin, "checkin_date" | "value" | "note">[];
  const streakInput = rows.map((r) => ({ checkinDate: r.checkin_date, value: r.value }));

  return {
    ...(habit as Omit<Habit, "user_id">),
    streak: calculateHabitStreak(streakInput, habit.frequency, habit.target_per_period, today),
    checkedInToday: rows.some((r) => r.checkin_date === today),
    recentCheckins: rows.slice(0, RECENT_CHECKIN_LIMIT),
  };
}

export type HabitTodaySummary = { activeCount: number; checkedInCount: number };

/** A lightweight "N of M checked in today" summary for /home — no streak
 * calculation, just two bounded counts. */
export async function getHabitTodaySummary(
  supabase: SupabaseClient<Database>,
  userId: string,
  today: string,
): Promise<HabitTodaySummary> {
  const { count: activeCount, error } = await supabase
    .from("habits")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) {
    console.error("Unable to load habit summary:", error.message);
    return { activeCount: 0, checkedInCount: 0 };
  }
  if (!activeCount) return { activeCount: 0, checkedInCount: 0 };

  const { count: checkedInCount, error: checkinError } = await supabase
    .from("habit_checkins")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("checkin_date", today);

  if (checkinError) {
    console.error("Unable to load habit summary:", checkinError.message);
    return { activeCount, checkedInCount: 0 };
  }

  return { activeCount, checkedInCount: checkedInCount ?? 0 };
}

export type HabitOption = { id: number; name: string };

/** Lightweight habit list for the journal's "link to a habit" dropdown. */
export async function listHabitOptions(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<HabitOption[]> {
  const { data, error } = await supabase
    .from("habits")
    .select("id, name")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Unable to load habit options:", error.message);
    return [];
  }

  return (data ?? []) as HabitOption[];
}
