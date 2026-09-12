import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/src/types/database";

// Typed wrappers around the communities SECURITY DEFINER RPCs. Application
// code must never write public.communities / community_members /
// community_post_links / community_bans directly — there is no
// INSERT/UPDATE/DELETE grant on any of them. These wrappers map the known
// SQLSTATEs to a small controlled result and never surface raw Postgres text.

export type MutationReason =
  | "not_available"
  | "invalid"
  | "slug_taken"
  | "unknown";

export type MutationResult<T = void> =
  | { status: "success"; data: T }
  | { status: "error"; reason: MutationReason; message?: string };

function classify(code: string | undefined): MutationReason {
  if (code === "23505") return "slug_taken";
  if (code === "42501") return "not_available";
  if (code === "22023" || code === "23514" || code === "23503") return "invalid";
  return "unknown";
}

export async function createCommunity(
  supabase: SupabaseClient<Database>,
  input: { name: string; slug: string; description: string; rules: string },
): Promise<MutationResult<{ id: number; slug: string }>> {
  const { data, error } = await supabase.rpc("create_community", {
    p_name: input.name,
    p_slug: input.slug,
    p_description: input.description,
    p_rules: input.rules,
  });
  if (!error) {
    return { status: "success", data: { id: data as number, slug: input.slug } };
  }
  if (classify(error.code) === "unknown") {
    console.error("create_community failed:", error.message);
  }
  return { status: "error", reason: classify(error.code) };
}

async function callCommunityIdMutation(
  supabase: SupabaseClient<Database>,
  fn: "join_community" | "leave_community",
  communityId: number,
): Promise<MutationResult> {
  const { error } = await supabase.rpc(fn, { p_community_id: communityId });
  if (!error) return { status: "success", data: undefined };
  if (classify(error.code) === "unknown") {
    console.error(`${fn} failed:`, error.message);
  }
  // leave_community's owner-guard message is safe to surface directly (it
  // never leaks anything beyond "you are the owner"); every other error
  // collapses to the caller's generic mapping.
  return {
    status: "error",
    reason: classify(error.code),
    message: fn === "leave_community" ? error.message : undefined,
  };
}

export const joinCommunity = (s: SupabaseClient<Database>, id: number) =>
  callCommunityIdMutation(s, "join_community", id);
export const leaveCommunity = (s: SupabaseClient<Database>, id: number) =>
  callCommunityIdMutation(s, "leave_community", id);

export async function createCommunityPost(
  supabase: SupabaseClient<Database>,
  input: { communityId: number; postType: string; body: string },
): Promise<MutationResult<number>> {
  const { data, error } = await supabase.rpc("create_community_post", {
    p_community_id: input.communityId,
    p_post_type: input.postType,
    p_body: input.body,
  });
  if (!error) return { status: "success", data: data as number };
  if (classify(error.code) === "unknown") {
    console.error("create_community_post failed:", error.message);
  }
  return { status: "error", reason: classify(error.code) };
}

export async function removeCommunityPost(
  supabase: SupabaseClient<Database>,
  input: { communityId: number; postId: number; reason?: string | null },
): Promise<MutationResult> {
  const { error } = await supabase.rpc("remove_community_post", {
    p_community_id: input.communityId,
    p_post_id: input.postId,
    p_reason: input.reason ?? null,
  });
  if (!error) return { status: "success", data: undefined };
  if (classify(error.code) === "unknown") {
    console.error("remove_community_post failed:", error.message);
  }
  return { status: "error", reason: classify(error.code) };
}

type RoleMutationRpc =
  | "promote_community_moderator"
  | "demote_community_moderator"
  | "remove_community_member"
  | "unban_community_member";

async function callRoleMutation(
  supabase: SupabaseClient<Database>,
  fn: RoleMutationRpc,
  communityId: number,
  userId: string,
): Promise<MutationResult> {
  const { error } = await supabase.rpc(fn, {
    p_community_id: communityId,
    p_user_id: userId,
  });
  if (!error) return { status: "success", data: undefined };
  if (classify(error.code) === "unknown") {
    console.error(`${fn} failed:`, error.message);
  }
  return { status: "error", reason: classify(error.code) };
}

export const promoteCommunityModerator = (
  s: SupabaseClient<Database>,
  communityId: number,
  userId: string,
) => callRoleMutation(s, "promote_community_moderator", communityId, userId);

export const demoteCommunityModerator = (
  s: SupabaseClient<Database>,
  communityId: number,
  userId: string,
) => callRoleMutation(s, "demote_community_moderator", communityId, userId);

export const removeCommunityMember = (
  s: SupabaseClient<Database>,
  communityId: number,
  userId: string,
) => callRoleMutation(s, "remove_community_member", communityId, userId);

export const unbanCommunityMember = (
  s: SupabaseClient<Database>,
  communityId: number,
  userId: string,
) => callRoleMutation(s, "unban_community_member", communityId, userId);

export async function banCommunityMember(
  supabase: SupabaseClient<Database>,
  input: { communityId: number; userId: string; reason?: string | null },
): Promise<MutationResult> {
  const { error } = await supabase.rpc("ban_community_member", {
    p_community_id: input.communityId,
    p_user_id: input.userId,
    p_reason: input.reason ?? null,
  });
  if (!error) return { status: "success", data: undefined };
  if (classify(error.code) === "unknown") {
    console.error("ban_community_member failed:", error.message);
  }
  return { status: "error", reason: classify(error.code) };
}
