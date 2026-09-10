import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Connection,
  ConnectionInteraction,
  ConnectionNudge,
  Database,
} from "@/src/types/database";

// Typed reads for the Connections feature. Every function takes a
// SupabaseClient<Database> (the existing Diong data-module convention).
//
// RLS already scopes connections and connection_interactions to their owner.
// These functions still pass an explicit userId and filter on it as defence in
// depth, matching src/lib/profile-data.ts.

const LIST_COLUMNS =
  "id, name, connection_type, connection_purpose, preferred_contact_days, last_meaningful_contact_at, is_active, created_at, updated_at";

const DETAIL_COLUMNS =
  "id, name, connection_type, connection_purpose, why_it_matters, preferred_contact_days, last_meaningful_contact_at, notes, is_active, created_at, updated_at";

const RECENT_INTERACTION_COLUMNS =
  "id, interaction_type, occurred_at, notes, created_at";

const RECENT_INTERACTION_LIMIT = 20;

export type ConnectionListItem = Pick<
  Connection,
  | "id"
  | "name"
  | "connection_type"
  | "connection_purpose"
  | "preferred_contact_days"
  | "last_meaningful_contact_at"
  | "is_active"
  | "created_at"
  | "updated_at"
>;

export type RecentInteraction = Pick<
  ConnectionInteraction,
  "id" | "interaction_type" | "occurred_at" | "notes" | "created_at"
>;

export type ConnectionDetail = Omit<Connection, "user_id"> & {
  interactions: RecentInteraction[];
};

export type ListConnectionsOptions = {
  includeInactive?: boolean;
};

/**
 * The current user's connections. Active only by default. Ordered for a calm
 * dashboard: active first, then the connections most in need of attention
 * (never contacted, then longest since contact), with a stable tiebreak.
 */
export async function listConnections(
  supabase: SupabaseClient<Database>,
  userId: string,
  options: ListConnectionsOptions = {},
): Promise<ConnectionListItem[]> {
  const base = supabase
    .from("connections")
    .select(LIST_COLUMNS)
    .eq("user_id", userId);

  const scoped = options.includeInactive ? base : base.eq("is_active", true);

  const { data, error } = await scoped
    .order("is_active", { ascending: false })
    .order("last_meaningful_contact_at", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Unable to load connections:", error.message);
    return [];
  }

  return (data ?? []) as ConnectionListItem[];
}

/**
 * One connection the current user owns, with its most recent interactions, or
 * null if it does not exist or belongs to someone else.
 */
export async function getConnection(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: number,
): Promise<ConnectionDetail | null> {
  if (!Number.isSafeInteger(id) || id <= 0) return null;

  const { data: connection, error } = await supabase
    .from("connections")
    .select(DETAIL_COLUMNS)
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Unable to load connection:", error.message);
    return null;
  }
  if (!connection) return null;

  const { data: interactions, error: interactionsError } = await supabase
    .from("connection_interactions")
    .select(RECENT_INTERACTION_COLUMNS)
    .eq("user_id", userId)
    .eq("connection_id", id)
    .order("occurred_at", { ascending: false })
    .limit(RECENT_INTERACTION_LIMIT);

  if (interactionsError) {
    console.error(
      "Unable to load connection interactions:",
      interactionsError.message,
    );
  }

  return {
    ...(connection as Omit<Connection, "user_id">),
    interactions: (interactions ?? []) as RecentInteraction[],
  };
}

/**
 * The current user's active connections with their calculated nudge status.
 * The nudge algorithm lives entirely in public.get_connection_nudges(); this is
 * a thin typed wrapper.
 */
export async function getConnectionNudges(
  supabase: SupabaseClient<Database>,
): Promise<ConnectionNudge[]> {
  try {
    const { data, error } = await supabase.rpc("get_connection_nudges");

    if (error) {
      console.error("Unable to load connection nudges:", error.message);
      return [];
    }

    return data ?? [];
  } catch (cause) {
    // A thrown error (transport failure, unexpected client state) must not break
    // any page that surfaces nudges — /home included. Callers treat [] as
    // "nothing to act on".
    console.error(
      "Unable to load connection nudges:",
      cause instanceof Error ? cause.message : cause,
    );
    return [];
  }
}

/**
 * The single highest-priority nudge worth surfacing (for the later /home area),
 * or null when nothing needs attention.
 *
 * get_connection_nudges() already returns rows ordered by priority — due, then
 * never_contacted, then approaching, then up_to_date — so the first row that is
 * not "up_to_date" is the highest priority. "up_to_date" is never a nudge.
 */
export async function getTopConnectionNudge(
  supabase: SupabaseClient<Database>,
): Promise<ConnectionNudge | null> {
  const nudges = await getConnectionNudges(supabase);
  return nudges.find((nudge) => nudge.status !== "up_to_date") ?? null;
}
