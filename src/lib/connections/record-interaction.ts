import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  RecordedConnectionInteraction,
} from "@/src/types/database";
import { interactionRpcArgs, type InteractionInput } from "./connection-validation";

// Typed wrapper around the public.record_connection_interaction() RPC.
// Application code must never insert into connection_interactions directly.
// Richer Postgres-error mapping belongs in the Phase D server actions; this
// wrapper only surfaces a small controlled result shape.

export type RecordInteractionResult =
  | { status: "success"; interaction: RecordedConnectionInteraction }
  | {
      status: "error";
      reason: "not_available" | "invalid" | "unknown";
      message: string;
    };

export async function recordConnectionInteraction(
  supabase: SupabaseClient<Database>,
  input: InteractionInput,
): Promise<RecordInteractionResult> {
  const { data, error } = await supabase.rpc(
    "record_connection_interaction",
    interactionRpcArgs(input),
  );

  if (error) {
    // 42501: authentication required, or the connection is not the caller's.
    if (error.code === "42501") {
      return {
        status: "error",
        reason: "not_available",
        message: "This connection is not available.",
      };
    }
    // 22023: the RPC rejected the input (type, notes length, future date).
    if (error.code === "22023") {
      return { status: "error", reason: "invalid", message: error.message };
    }
    console.error("record_connection_interaction failed:", error.message);
    return {
      status: "error",
      reason: "unknown",
      message: "We could not record this interaction.",
    };
  }

  const interaction = data?.[0];
  if (!interaction) {
    return {
      status: "error",
      reason: "unknown",
      message: "We could not record this interaction.",
    };
  }

  return { status: "success", interaction };
}
