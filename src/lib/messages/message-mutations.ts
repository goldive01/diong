import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/src/types/database";

// Typed wrappers around the direct-message SECURITY DEFINER RPCs. Application
// code must never write public.conversations / conversation_members /
// messages directly — there is no INSERT/UPDATE/DELETE grant on any of them.
// These wrappers map the known SQLSTATEs to a small controlled result and
// never surface raw Postgres text, matching post-mutations.ts / social-
// mutations.ts.

export type MutationReason = "not_available" | "invalid" | "unknown";

export type MutationResult<T = void> =
  | { status: "success"; data: T }
  | { status: "error"; reason: MutationReason };

function classify(code: string | undefined): MutationReason {
  if (code === "42501") return "not_available";
  if (code === "22023" || code === "23514" || code === "23503") return "invalid";
  return "unknown";
}

/** Returns the single direct conversation with `otherUserId`, creating it if needed. */
export async function getOrCreateConversation(
  supabase: SupabaseClient<Database>,
  otherUserId: string,
): Promise<MutationResult<number>> {
  const { data, error } = await supabase.rpc("get_or_create_conversation", {
    p_other_user_id: otherUserId,
  });
  if (!error) return { status: "success", data: data as number };
  if (classify(error.code) === "unknown") {
    console.error("get_or_create_conversation failed:", error.message);
  }
  return { status: "error", reason: classify(error.code) };
}

export async function sendMessage(
  supabase: SupabaseClient<Database>,
  input: { conversationId: number; body: string },
): Promise<MutationResult<number>> {
  const { data, error } = await supabase.rpc("send_message", {
    p_conversation_id: input.conversationId,
    p_body: input.body,
  });
  if (!error) return { status: "success", data: data as number };
  if (classify(error.code) === "unknown") {
    console.error("send_message failed:", error.message);
  }
  return { status: "error", reason: classify(error.code) };
}

export async function markConversationRead(
  supabase: SupabaseClient<Database>,
  conversationId: number,
): Promise<MutationResult> {
  const { error } = await supabase.rpc("mark_conversation_read", {
    p_conversation_id: conversationId,
  });
  if (!error) return { status: "success", data: undefined };
  if (classify(error.code) === "unknown") {
    console.error("mark_conversation_read failed:", error.message);
  }
  return { status: "error", reason: classify(error.code) };
}
