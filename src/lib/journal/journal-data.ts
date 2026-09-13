import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, JournalEntry, JournalMood } from "@/src/types/database";
import { journalPreview } from "@/src/lib/journal/journal-labels";
import { getOffsetPagination, PAGE_SIZE } from "@/src/lib/journal/journal-pagination";

// Typed reads for the private Journal. Every function takes a
// SupabaseClient<Database> (the existing Diong data-module convention). RLS
// already scopes journal_entries to their owner; these functions still pass
// an explicit userId and filter on it as defence in depth, matching
// src/lib/connections/connections-data.ts. Journal content is never read by
// any other data module — it must never reach the feed, Discover, global
// Search, public profiles, communities or messages.

/** Strips characters that carry syntactic meaning in PostgREST's `.or()`
 * mini-DSL (comma separates conditions, parentheses group) so a search
 * string can never break out of the intended two-column filter shape. */
function sanitizeForOrFilter(value: string): string {
  return value.replace(/[,()]/g, " ");
}

/** Escapes SQL LIKE/ILIKE wildcards so a literal "%" or "_" in a search
 * string is matched literally rather than as a wildcard. */
function escapeIlikeWildcards(value: string): string {
  return value.replace(/[%_]/g, (ch) => `\\${ch}`);
}

export type JournalFilters = {
  mood?: JournalMood;
  entryDate?: string;
  query?: string;
};

export type JournalListItem = {
  id: number;
  title: string | null;
  entryDate: string;
  mood: JournalMood | null;
  bodyPreview: string;
  goal: { id: number; title: string } | null;
  habit: { id: number; name: string } | null;
  primeTitle: string | null;
};

export type JournalListPage = {
  entries: JournalListItem[];
  page: number;
  pageSize: number;
  hasPrevious: boolean;
  hasNext: boolean;
  total: number;
};

function emptyPage(page: number): JournalListPage {
  return { entries: [], page, pageSize: PAGE_SIZE, hasPrevious: page > 1, hasNext: false, total: 0 };
}

/**
 * The current user's journal entries, newest first, optionally filtered by
 * mood, an exact entry date, or a text search across title/body. Always
 * paginated — never an unbounded read.
 */
export async function listJournalEntries(
  supabase: SupabaseClient<Database>,
  userId: string,
  page: number,
  filters: JournalFilters = {},
): Promise<JournalListPage> {
  const { page: safePage, pageSize, offset } = getOffsetPagination(page);

  let builder = supabase
    .from("journal_entries")
    .select("id, title, body, mood, entry_date, goal_id, habit_id, prime_assignment_id", {
      count: "exact",
    })
    .eq("user_id", userId);

  if (filters.mood) builder = builder.eq("mood", filters.mood);
  if (filters.entryDate) builder = builder.eq("entry_date", filters.entryDate);
  if (filters.query && filters.query.trim() !== "") {
    const safe = sanitizeForOrFilter(escapeIlikeWildcards(filters.query.trim()));
    builder = builder.or(`title.ilike.%${safe}%,body.ilike.%${safe}%`);
  }

  const { data, error, count } = await builder
    .order("entry_date", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) {
    console.error("Unable to load journal entries:", error.message);
    return emptyPage(safePage);
  }

  const rows = (data ?? []) as Pick<
    JournalEntry,
    "id" | "title" | "body" | "mood" | "entry_date" | "goal_id" | "habit_id" | "prime_assignment_id"
  >[];

  const { goalTitles, habitNames, primeTitles } = await resolveLinkedLabels(
    supabase,
    userId,
    rows,
  );

  const entries: JournalListItem[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    entryDate: row.entry_date,
    mood: row.mood,
    bodyPreview: journalPreview(row.body),
    goal: row.goal_id !== null && goalTitles.has(row.goal_id)
      ? { id: row.goal_id, title: goalTitles.get(row.goal_id)! }
      : null,
    habit: row.habit_id !== null && habitNames.has(row.habit_id)
      ? { id: row.habit_id, name: habitNames.get(row.habit_id)! }
      : null,
    primeTitle:
      row.prime_assignment_id !== null
        ? (primeTitles.get(row.prime_assignment_id) ?? null)
        : null,
  }));

  return {
    entries,
    page: safePage,
    pageSize,
    hasPrevious: safePage > 1,
    hasNext: offset + entries.length < (count ?? 0),
    total: count ?? 0,
  };
}

/** Batch-resolves goal/habit/Prime labels for a page of entries in at most
 * three extra queries — never one query per row. */
async function resolveLinkedLabels(
  supabase: SupabaseClient<Database>,
  userId: string,
  rows: Pick<JournalEntry, "goal_id" | "habit_id" | "prime_assignment_id">[],
): Promise<{
  goalTitles: Map<number, string>;
  habitNames: Map<number, string>;
  primeTitles: Map<number, string>;
}> {
  const goalIds = [...new Set(rows.map((r) => r.goal_id).filter((id): id is number => id !== null))];
  const habitIds = [...new Set(rows.map((r) => r.habit_id).filter((id): id is number => id !== null))];
  const primeAssignmentIds = [
    ...new Set(rows.map((r) => r.prime_assignment_id).filter((id): id is number => id !== null)),
  ];

  const goalTitles = new Map<number, string>();
  const habitNames = new Map<number, string>();
  const primeTitles = new Map<number, string>();

  if (goalIds.length > 0) {
    const { data } = await supabase
      .from("goals")
      .select("id, title")
      .eq("user_id", userId)
      .in("id", goalIds);
    for (const row of data ?? []) goalTitles.set(row.id, row.title);
  }

  if (habitIds.length > 0) {
    const { data } = await supabase
      .from("habits")
      .select("id, name")
      .eq("user_id", userId)
      .in("id", habitIds);
    for (const row of data ?? []) habitNames.set(row.id, row.name);
  }

  if (primeAssignmentIds.length > 0) {
    const { data: assignments } = await supabase
      .from("prime_assignments")
      .select("id, prime_protocol_id")
      .eq("user_id", userId)
      .in("id", primeAssignmentIds);
    const protocolIds = [...new Set((assignments ?? []).map((a) => a.prime_protocol_id))];
    if (protocolIds.length > 0) {
      const { data: protocols } = await supabase
        .from("prime_protocols")
        .select("id, title")
        .in("id", protocolIds);
      const protocolTitleById = new Map((protocols ?? []).map((p) => [p.id, p.title]));
      for (const assignment of assignments ?? []) {
        const title = protocolTitleById.get(assignment.prime_protocol_id);
        if (title) primeTitles.set(assignment.id, title);
      }
    }
  }

  return { goalTitles, habitNames, primeTitles };
}

export type PrimeAssignmentOption = { id: number; label: string };

/** The user's most recent Daily Prime assignments, for the journal's
 * "link to a Daily Prime" dropdown. Bounded — never the full history. */
export async function listPrimeAssignmentOptions(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<PrimeAssignmentOption[]> {
  const { data: assignments, error } = await supabase
    .from("prime_assignments")
    .select("id, assigned_date, prime_protocol_id")
    .eq("user_id", userId)
    .order("assigned_date", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Unable to load Daily Prime options:", error.message);
    return [];
  }
  if (!assignments || assignments.length === 0) return [];

  const protocolIds = [...new Set(assignments.map((a) => a.prime_protocol_id))];
  const { data: protocols } = await supabase
    .from("prime_protocols")
    .select("id, title")
    .in("id", protocolIds);
  const titleById = new Map((protocols ?? []).map((p) => [p.id, p.title]));

  return assignments.map((a) => ({
    id: a.id,
    label: `${titleById.get(a.prime_protocol_id) ?? "Daily Prime"} — ${a.assigned_date}`,
  }));
}

export type JournalEntryDetail = Omit<JournalEntry, "user_id"> & {
  goal: { id: number; title: string } | null;
  habit: { id: number; name: string } | null;
  primeTitle: string | null;
};

/** One journal entry the current user owns, with its linked resources
 * resolved for display, or null if it does not exist or belongs to someone
 * else. */
export async function getJournalEntry(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: number,
): Promise<JournalEntryDetail | null> {
  if (!Number.isSafeInteger(id) || id <= 0) return null;

  const { data: entry, error } = await supabase
    .from("journal_entries")
    .select(
      "id, title, body, mood, entry_date, goal_id, habit_id, prime_assignment_id, created_at, updated_at",
    )
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Unable to load journal entry:", error.message);
    return null;
  }
  if (!entry) return null;

  const { goalTitles, habitNames, primeTitles } = await resolveLinkedLabels(supabase, userId, [
    entry,
  ]);

  return {
    ...(entry as Omit<JournalEntry, "user_id">),
    goal:
      entry.goal_id !== null && goalTitles.has(entry.goal_id)
        ? { id: entry.goal_id, title: goalTitles.get(entry.goal_id)! }
        : null,
    habit:
      entry.habit_id !== null && habitNames.has(entry.habit_id)
        ? { id: entry.habit_id, name: habitNames.get(entry.habit_id)! }
        : null,
    primeTitle:
      entry.prime_assignment_id !== null
        ? (primeTitles.get(entry.prime_assignment_id) ?? null)
        : null,
  };
}
