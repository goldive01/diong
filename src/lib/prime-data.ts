import type { SupabaseClient } from "@supabase/supabase-js";
import type { DailyPrime, Database } from "@/src/types/database";
import type {
  PrimeHistoryDetail,
  PrimeHistoryItem,
} from "@/src/lib/prime-history";
import {
  calculatePrimeProgress,
  type PrimeProgress,
  type PrimeProgressInput,
} from "@/src/lib/prime-progress";

export type DailyPrimeResult =
  | { status: "ready"; prime: DailyPrime }
  | { status: "empty" }
  | { status: "error" };

export async function getDailyPrime(
  supabase: SupabaseClient<Database>,
): Promise<DailyPrimeResult> {
  const { data, error } = await supabase.rpc("get_or_assign_daily_prime");

  if (error) {
    console.error("Unable to load Daily Prime:", error.message);
    return { status: "error" };
  }

  const prime = data?.[0];
  return prime ? { status: "ready", prime } : { status: "empty" };
}

// ---------------------------------------------------------------------------
// Phase G: history, reflection and progress reads
//
// RLS already scopes prime_assignments and prime_completions to their owner.
// Every function below also passes an explicit userId and filters on it, the
// same defence-in-depth pattern used by src/lib/profile-data.ts and the
// Connections data layer. Joins are done as separate owner-scoped queries
// (matching getInterestNames) rather than PostgREST embeds.
// ---------------------------------------------------------------------------

/** UTC calendar date, matching the database's `current_date` (UTC session). */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * The saved reflection for one of the current user's completions, or null when
 * there is no completion, no reflection, or the read fails. Used to prefill the
 * reflection form on /daily-prime.
 */
export async function getPrimeReflection(
  supabase: SupabaseClient<Database>,
  userId: string,
  assignmentId: number,
): Promise<string | null> {
  if (!Number.isSafeInteger(assignmentId) || assignmentId <= 0) return null;

  const { data, error } = await supabase
    .from("prime_completions")
    .select("reflection")
    .eq("user_id", userId)
    .eq("prime_assignment_id", assignmentId)
    .maybeSingle();

  if (error) {
    console.error("Unable to load Prime reflection:", error.message);
    return null;
  }
  return data?.reflection ?? null;
}

type ProtocolSummary = { title: string; categoryName: string | null };

async function loadProtocolSummaries(
  supabase: SupabaseClient<Database>,
  protocolIds: number[],
): Promise<Map<number, ProtocolSummary>> {
  const ids = [...new Set(protocolIds)];
  const summaries = new Map<number, ProtocolSummary>();
  if (ids.length === 0) return summaries;

  const { data: protocols, error } = await supabase
    .from("prime_protocols")
    .select("id, title, category_id")
    .in("id", ids);

  if (error || !protocols) {
    if (error) console.error("Unable to load Prime protocols:", error.message);
    return summaries;
  }

  const categoryNames = new Map<number, string>();
  const categoryIds = [...new Set(protocols.map((p) => p.category_id))];
  if (categoryIds.length > 0) {
    const { data: categories, error: categoryError } = await supabase
      .from("prime_categories")
      .select("id, name")
      .in("id", categoryIds);
    if (categoryError) {
      console.error("Unable to load Prime categories:", categoryError.message);
    }
    for (const category of categories ?? []) {
      categoryNames.set(category.id, category.name);
    }
  }

  for (const protocol of protocols) {
    summaries.set(protocol.id, {
      title: protocol.title,
      categoryName: categoryNames.get(protocol.category_id) ?? null,
    });
  }
  return summaries;
}

type CompletionSummary = { completedAt: string; hasReflection: boolean };

async function loadCompletionsByAssignment(
  supabase: SupabaseClient<Database>,
  userId: string,
  assignmentIds: number[],
): Promise<Map<number, CompletionSummary>> {
  const byAssignment = new Map<number, CompletionSummary>();
  if (assignmentIds.length === 0) return byAssignment;

  const { data: completions, error } = await supabase
    .from("prime_completions")
    .select("prime_assignment_id, completed_at, reflection")
    .eq("user_id", userId)
    .in("prime_assignment_id", assignmentIds);

  if (error || !completions) {
    if (error) console.error("Unable to load Prime completions:", error.message);
    return byAssignment;
  }

  for (const completion of completions) {
    byAssignment.set(completion.prime_assignment_id, {
      completedAt: completion.completed_at,
      hasReflection: Boolean(
        completion.reflection && completion.reflection.trim(),
      ),
    });
  }
  return byAssignment;
}

/**
 * The current user's Prime assignments, newest first. The list never carries
 * the reflection text itself — only a `hasReflection` flag.
 */
export async function listPrimeHistory(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<PrimeHistoryItem[]> {
  const { data: assignments, error } = await supabase
    .from("prime_assignments")
    .select("id, assigned_date, prime_protocol_id")
    .eq("user_id", userId)
    .order("assigned_date", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    console.error("Unable to load Prime history:", error.message);
    return [];
  }

  const rows = assignments ?? [];
  if (rows.length === 0) return [];

  const [protocols, completions] = await Promise.all([
    loadProtocolSummaries(
      supabase,
      rows.map((row) => row.prime_protocol_id),
    ),
    loadCompletionsByAssignment(
      supabase,
      userId,
      rows.map((row) => row.id),
    ),
  ]);

  return rows.map((row) => {
    const protocol = protocols.get(row.prime_protocol_id) ?? null;
    const completion = completions.get(row.id) ?? null;
    return {
      id: row.id,
      assignedDate: row.assigned_date,
      categoryName: protocol?.categoryName ?? null,
      title: protocol?.title ?? null,
      completed: completion !== null,
      completedAt: completion?.completedAt ?? null,
      hasReflection: completion?.hasReflection ?? false,
    };
  });
}

/**
 * One Prime assignment the current user owns, with its protocol content and
 * completion/reflection state. Returns null for an out-of-range id, a missing
 * assignment, or an assignment owned by another user — the page `notFound()`s
 * on every one of those.
 */
export async function getPrimeHistoryAssignment(
  supabase: SupabaseClient<Database>,
  userId: string,
  assignmentId: number,
): Promise<PrimeHistoryDetail | null> {
  if (!Number.isSafeInteger(assignmentId) || assignmentId <= 0) return null;

  const { data: assignment, error } = await supabase
    .from("prime_assignments")
    .select("id, assigned_date, prime_protocol_id")
    .eq("user_id", userId)
    .eq("id", assignmentId)
    .maybeSingle();

  if (error) {
    console.error("Unable to load Prime history assignment:", error.message);
    return null;
  }
  if (!assignment) return null;

  const { data: protocol, error: protocolError } = await supabase
    .from("prime_protocols")
    .select(
      "title, purpose, best_time, prime_text, action_trigger, tomorrows_expectation, reflection_prompt, category_id",
    )
    .eq("id", assignment.prime_protocol_id)
    .maybeSingle();
  if (protocolError) {
    console.error("Unable to load Prime protocol:", protocolError.message);
  }

  let categoryName: string | null = null;
  if (protocol) {
    const { data: category } = await supabase
      .from("prime_categories")
      .select("name")
      .eq("id", protocol.category_id)
      .maybeSingle();
    categoryName = category?.name ?? null;
  }

  const { data: completion, error: completionError } = await supabase
    .from("prime_completions")
    .select("completed_at, reflection")
    .eq("user_id", userId)
    .eq("prime_assignment_id", assignmentId)
    .maybeSingle();
  if (completionError) {
    console.error("Unable to load Prime completion:", completionError.message);
  }

  return {
    id: assignment.id,
    assignedDate: assignment.assigned_date,
    categoryName,
    title: protocol?.title ?? null,
    purpose: protocol?.purpose ?? null,
    bestTime: protocol?.best_time ?? null,
    primeText: protocol?.prime_text ?? null,
    actionTrigger: protocol?.action_trigger ?? null,
    tomorrowsExpectation: protocol?.tomorrows_expectation ?? null,
    reflectionPrompt: protocol?.reflection_prompt ?? null,
    completed: Boolean(completion),
    completedAt: completion?.completed_at ?? null,
    reflection: completion?.reflection ?? null,
    isToday: assignment.assigned_date === todayIso(),
  };
}

/**
 * Lightweight progress summary for /daily-prime/history, computed only from the
 * user's real assignment and completion dates. Falls back to an all-zero
 * summary (never an error) if a read fails.
 */
export async function getPrimeProgress(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<PrimeProgress> {
  const emptyProgress: PrimeProgress = {
    totalAssigned: 0,
    totalCompleted: 0,
    completionRate: 0,
    currentStreak: 0,
    longestStreak: 0,
  };

  const { data: assignments, error } = await supabase
    .from("prime_assignments")
    .select("id, assigned_date")
    .eq("user_id", userId);

  if (error) {
    console.error("Unable to load Prime progress:", error.message);
    return emptyProgress;
  }
  const rows = assignments ?? [];
  if (rows.length === 0) return emptyProgress;

  const { data: completions, error: completionError } = await supabase
    .from("prime_completions")
    .select("prime_assignment_id")
    .eq("user_id", userId);

  if (completionError) {
    console.error(
      "Unable to load Prime progress completions:",
      completionError.message,
    );
    return emptyProgress;
  }

  const completedIds = new Set(
    (completions ?? []).map((row) => row.prime_assignment_id),
  );
  const input: PrimeProgressInput[] = rows.map((row) => ({
    assignedDate: row.assigned_date,
    completed: completedIds.has(row.id),
  }));

  return calculatePrimeProgress(input, todayIso());
}
