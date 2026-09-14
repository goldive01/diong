import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/src/types/database";

// Typed wrappers around the social-content SECURITY DEFINER RPCs. Application
// code must never write public.posts / post_comments / post_likes /
// post_bookmarks directly — there is no INSERT/UPDATE/DELETE grant on any of
// them. These wrappers map the known SQLSTATEs to a small controlled result and
// never surface raw Postgres text.

export type MutationReason = "not_available" | "invalid" | "unknown";

export type MutationResult<T = void> =
  | { status: "success"; data: T }
  | { status: "error"; reason: MutationReason };

function classify(code: string | undefined): MutationReason {
  if (code === "42501") return "not_available";
  if (code === "22023" || code === "23514" || code === "23503") return "invalid";
  return "unknown";
}

export async function createPost(
  supabase: SupabaseClient<Database>,
  input: { postType: string; body: string; visibility: string },
): Promise<MutationResult<number>> {
  const { data, error } = await supabase.rpc("create_post", {
    p_post_type: input.postType,
    p_body: input.body,
    p_visibility: input.visibility,
  });
  if (!error) return { status: "success", data: data as number };
  if (classify(error.code) === "unknown") {
    console.error("create_post failed:", error.message);
  }
  return { status: "error", reason: classify(error.code) };
}

export async function updatePost(
  supabase: SupabaseClient<Database>,
  input: { postId: number; body: string; visibility: string },
): Promise<MutationResult> {
  const { error } = await supabase.rpc("update_post", {
    p_post_id: input.postId,
    p_body: input.body,
    p_visibility: input.visibility,
  });
  if (!error) return { status: "success", data: undefined };
  if (classify(error.code) === "unknown") {
    console.error("update_post failed:", error.message);
  }
  return { status: "error", reason: classify(error.code) };
}

export async function softDeletePost(
  supabase: SupabaseClient<Database>,
  postId: number,
): Promise<MutationResult> {
  const { error } = await supabase.rpc("soft_delete_post", {
    p_post_id: postId,
  });
  if (!error) return { status: "success", data: undefined };
  if (classify(error.code) === "unknown") {
    console.error("soft_delete_post failed:", error.message);
  }
  return { status: "error", reason: classify(error.code) };
}

export async function createComment(
  supabase: SupabaseClient<Database>,
  input: { postId: number; body: string; parentCommentId?: number | null },
): Promise<MutationResult<number>> {
  const { data, error } = await supabase.rpc("create_comment", {
    p_post_id: input.postId,
    p_body: input.body,
    p_parent_comment_id: input.parentCommentId ?? null,
  });
  if (!error) return { status: "success", data: data as number };
  if (classify(error.code) === "unknown") {
    console.error("create_comment failed:", error.message);
  }
  return { status: "error", reason: classify(error.code) };
}

export async function editComment(
  supabase: SupabaseClient<Database>,
  input: { commentId: number; body: string },
): Promise<MutationResult> {
  const { error } = await supabase.rpc("edit_own_comment", {
    p_comment_id: input.commentId,
    p_body: input.body,
  });
  if (!error) return { status: "success", data: undefined };
  if (classify(error.code) === "unknown") {
    console.error("edit_own_comment failed:", error.message);
  }
  return { status: "error", reason: classify(error.code) };
}

export async function deleteComment(
  supabase: SupabaseClient<Database>,
  commentId: number,
): Promise<MutationResult> {
  const { error } = await supabase.rpc("delete_own_comment", {
    p_comment_id: commentId,
  });
  if (!error) return { status: "success", data: undefined };
  if (classify(error.code) === "unknown") {
    console.error("delete_own_comment failed:", error.message);
  }
  return { status: "error", reason: classify(error.code) };
}

type EngagementRpc =
  | "like_post"
  | "unlike_post"
  | "bookmark_post"
  | "remove_bookmark";

async function callEngagement(
  supabase: SupabaseClient<Database>,
  fn: EngagementRpc,
  postId: number,
): Promise<MutationResult> {
  const { error } = await supabase.rpc(fn, { p_post_id: postId });
  if (!error) return { status: "success", data: undefined };
  if (classify(error.code) === "unknown") {
    console.error(`${fn} failed:`, error.message);
  }
  return { status: "error", reason: classify(error.code) };
}

export const likePost = (s: SupabaseClient<Database>, id: number) =>
  callEngagement(s, "like_post", id);
export const unlikePost = (s: SupabaseClient<Database>, id: number) =>
  callEngagement(s, "unlike_post", id);
export const bookmarkPost = (s: SupabaseClient<Database>, id: number) =>
  callEngagement(s, "bookmark_post", id);
export const removeBookmark = (s: SupabaseClient<Database>, id: number) =>
  callEngagement(s, "remove_bookmark", id);

// Pass 7 — post images. post_media is RPC-only, same reasoning as posts /
// post_comments above: attach_post_media() re-validates ownership, mime
// type, size and the 4-image ceiling; remove_post_media() re-validates
// ownership and returns the storage_path so the caller can delete the
// Storage object once the DB row is gone.
export async function attachPostMedia(
  supabase: SupabaseClient<Database>,
  input: {
    postId: number;
    storagePath: string;
    mimeType: string;
    sizeBytes: number;
    width?: number | null;
    height?: number | null;
    altText?: string | null;
  },
): Promise<MutationResult<number>> {
  const { data, error } = await supabase.rpc("attach_post_media", {
    p_post_id: input.postId,
    p_storage_path: input.storagePath,
    p_mime_type: input.mimeType,
    p_size_bytes: input.sizeBytes,
    p_width: input.width ?? null,
    p_height: input.height ?? null,
    p_alt_text: input.altText ?? null,
  });
  if (!error) return { status: "success", data: data as number };
  if (classify(error.code) === "unknown") {
    console.error("attach_post_media failed:", error.message);
  }
  return { status: "error", reason: classify(error.code) };
}

export async function removePostMedia(
  supabase: SupabaseClient<Database>,
  mediaId: number,
): Promise<MutationResult<string>> {
  const { data, error } = await supabase.rpc("remove_post_media", {
    p_media_id: mediaId,
  });
  if (!error) return { status: "success", data: data as string };
  if (classify(error.code) === "unknown") {
    console.error("remove_post_media failed:", error.message);
  }
  return { status: "error", reason: classify(error.code) };
}
