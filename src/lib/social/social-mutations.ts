import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/src/types/database";

// Typed wrappers around the social-graph SECURITY DEFINER RPCs. Application code
// must never write public.follows or public.blocks directly — there is no
// INSERT/UPDATE/DELETE grant on either table. Richer error handling belongs in
// the server actions; these wrappers only map the known SQLSTATEs to a small
// controlled result and never surface raw Postgres text.

export type SocialMutationResult =
  | { status: "success" }
  | { status: "error"; reason: "not_available" | "invalid" | "unknown" };

type SocialMutationRpc =
  | "follow_user"
  | "unfollow_user"
  | "block_user"
  | "unblock_user";

async function callSocialMutation(
  supabase: SupabaseClient<Database>,
  fn: SocialMutationRpc,
  targetUserId: string,
): Promise<SocialMutationResult> {
  const { error } = await supabase.rpc(fn, { p_target_id: targetUserId });

  if (!error) return { status: "success" };

  // 42501: authentication required, target not available, or a block stands
  // between the two users.
  if (error.code === "42501") {
    return { status: "error", reason: "not_available" };
  }
  // 22023: the RPC rejected the input (null target, self-follow, self-block).
  if (error.code === "22023") {
    return { status: "error", reason: "invalid" };
  }

  console.error(`${fn} failed:`, error.message);
  return { status: "error", reason: "unknown" };
}

export function followUser(
  supabase: SupabaseClient<Database>,
  targetUserId: string,
): Promise<SocialMutationResult> {
  return callSocialMutation(supabase, "follow_user", targetUserId);
}

export function unfollowUser(
  supabase: SupabaseClient<Database>,
  targetUserId: string,
): Promise<SocialMutationResult> {
  return callSocialMutation(supabase, "unfollow_user", targetUserId);
}

export function blockUser(
  supabase: SupabaseClient<Database>,
  targetUserId: string,
): Promise<SocialMutationResult> {
  return callSocialMutation(supabase, "block_user", targetUserId);
}

export function unblockUser(
  supabase: SupabaseClient<Database>,
  targetUserId: string,
): Promise<SocialMutationResult> {
  return callSocialMutation(supabase, "unblock_user", targetUserId);
}
