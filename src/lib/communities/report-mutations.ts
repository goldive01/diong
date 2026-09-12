import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ReportReason, ReportTargetType } from "@/src/types/database";

// Typed wrapper around create_report(). Application code must never write
// public.reports directly — there is no INSERT grant on it at all. The
// database silently no-ops a duplicate open report (see the migration), so
// this wrapper always reports success on the happy path and never reveals
// whether a report was the first for its target.

export type ReportMutationResult =
  | { status: "success" }
  | { status: "error"; reason: "not_available" | "invalid" | "unknown" };

function classify(code: string | undefined): "not_available" | "invalid" | "unknown" {
  if (code === "42501") return "not_available";
  if (code === "22023" || code === "23514" || code === "23503") return "invalid";
  return "unknown";
}

export async function createReport(
  supabase: SupabaseClient<Database>,
  input: {
    targetType: ReportTargetType;
    targetId?: number | null;
    targetUserId?: string | null;
    reason: ReportReason;
    details?: string | null;
  },
): Promise<ReportMutationResult> {
  const { error } = await supabase.rpc("create_report", {
    p_target_type: input.targetType,
    p_target_id: input.targetId ?? null,
    p_target_user_id: input.targetUserId ?? null,
    p_reason: input.reason,
    p_details: input.details ?? null,
  });
  if (!error) return { status: "success" };
  if (classify(error.code) === "unknown") {
    console.error("create_report failed:", error.message);
  }
  return { status: "error", reason: classify(error.code) };
}
