"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCompletedProfile } from "@/src/lib/auth";
import { listUserPosts, type FeedPost } from "@/src/lib/social/post-data";
import {
  attachPostMedia,
  bookmarkPost,
  createComment,
  deleteComment,
  editComment,
  likePost,
  removeBookmark,
  removePostMedia,
  softDeletePost,
  unlikePost,
  updatePost,
} from "@/src/lib/social/post-mutations";
import { isOwnedPath } from "@/src/lib/media/storage-paths";
import { safeDeleteObject } from "@/src/lib/media/storage-server";
import type { MediaActionResult } from "@/src/lib/media/media-action-result";
import {
  clampLimit,
  hasErrors,
  normalizePostBody,
  parseFeedCursor,
  validateCommentInput,
  validatePostInput,
} from "@/src/lib/social/post-validation";
import {
  readCommentBody,
  readPostFormValues,
  type CommentFormState,
  type DeletePostState,
  type PostFormState,
  type ToggleActionState,
} from "@/src/lib/social/post-form-state";

// Every export is an async server action. Post / comment ids are bound as
// leading server arguments by the rendering component — never form fields — so
// the browser cannot read or change them. The acting user always comes from
// requireCompletedProfile(); the RPCs re-derive it. Errors return a safe generic
// message and preserve the previous UI state.

const GENERIC = "Something went wrong. Please try again.";
const UNAVAILABLE = "This post is not available.";

function toSafeId(value: number): number | null {
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

function revalidatePost(postId: number) {
  revalidatePath("/feed");
  revalidatePath("/saved");
  revalidatePath(`/posts/${postId}`);
}

// ---------------------------------------------------------------------------
// Like / bookmark toggles
// ---------------------------------------------------------------------------

export async function toggleLike(
  postId: number,
  previousState: ToggleActionState,
): Promise<ToggleActionState> {
  const id = toSafeId(postId);
  if (id === null) {
    return { ...previousState, status: "error", message: UNAVAILABLE };
  }

  const { supabase } = await requireCompletedProfile();
  const result = previousState.active
    ? await unlikePost(supabase, id)
    : await likePost(supabase, id);

  if (result.status === "error") {
    return {
      ...previousState,
      status: "error",
      message: result.reason === "not_available" ? UNAVAILABLE : GENERIC,
    };
  }

  revalidatePost(id);
  const active = !previousState.active;
  return {
    status: "success",
    active,
    count: Math.max(0, previousState.count + (active ? 1 : -1)),
    message: "",
  };
}

export async function toggleBookmark(
  postId: number,
  previousState: ToggleActionState,
): Promise<ToggleActionState> {
  const id = toSafeId(postId);
  if (id === null) {
    return { ...previousState, status: "error", message: UNAVAILABLE };
  }

  const { supabase } = await requireCompletedProfile();
  const result = previousState.active
    ? await removeBookmark(supabase, id)
    : await bookmarkPost(supabase, id);

  if (result.status === "error") {
    return {
      ...previousState,
      status: "error",
      message: result.reason === "not_available" ? UNAVAILABLE : GENERIC,
    };
  }

  revalidatePost(id);
  return {
    status: "success",
    active: !previousState.active,
    count: previousState.count,
    message: "",
  };
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export async function submitComment(
  postId: number,
  parentCommentId: number | null,
  _previousState: CommentFormState,
  formData: FormData,
): Promise<CommentFormState> {
  const body = readCommentBody(formData);
  const id = toSafeId(postId);
  if (id === null) {
    return { status: "error", errors: {}, message: UNAVAILABLE, body };
  }

  const parent =
    parentCommentId !== null ? toSafeId(parentCommentId) : null;
  const errors = validateCommentInput({ body, parentCommentId: parent });
  if (hasErrors(errors)) {
    return { status: "error", errors, message: "", body };
  }

  const { supabase } = await requireCompletedProfile();
  const result = await createComment(supabase, {
    postId: id,
    body: normalizePostBody(body),
    parentCommentId: parent,
  });

  if (result.status === "error") {
    return {
      status: "error",
      errors: {},
      message: result.reason === "not_available" ? UNAVAILABLE : GENERIC,
      body,
    };
  }

  revalidatePost(id);
  return { status: "success", errors: {}, message: "Comment added.", body: "" };
}

export async function editCommentAction(
  postId: number,
  commentId: number,
  _previousState: CommentFormState,
  formData: FormData,
): Promise<CommentFormState> {
  const body = readCommentBody(formData);
  const pId = toSafeId(postId);
  const cId = toSafeId(commentId);
  if (pId === null || cId === null) {
    return { status: "error", errors: {}, message: UNAVAILABLE, body };
  }

  const errors = validateCommentInput({ body, parentCommentId: null });
  if (hasErrors(errors)) {
    return { status: "error", errors, message: "", body };
  }

  const { supabase } = await requireCompletedProfile();
  const result = await editComment(supabase, {
    commentId: cId,
    body: normalizePostBody(body),
  });

  if (result.status === "error") {
    return {
      status: "error",
      errors: {},
      message: result.reason === "not_available" ? UNAVAILABLE : GENERIC,
      body,
    };
  }

  revalidatePost(pId);
  return { status: "success", errors: {}, message: "Comment updated.", body };
}

export async function deleteCommentAction(
  postId: number,
  commentId: number,
): Promise<{ status: "idle" | "error"; message: string }> {
  const pId = toSafeId(postId);
  const cId = toSafeId(commentId);
  if (pId === null || cId === null) {
    return { status: "error", message: UNAVAILABLE };
  }

  const { supabase } = await requireCompletedProfile();
  const result = await deleteComment(supabase, cId);
  if (result.status === "error") {
    return {
      status: "error",
      message: result.reason === "not_available" ? UNAVAILABLE : GENERIC,
    };
  }

  revalidatePost(pId);
  return { status: "idle", message: "" };
}

// ---------------------------------------------------------------------------
// Post edit / delete
// ---------------------------------------------------------------------------

export async function updatePostAction(
  postId: number,
  _previousState: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  const values = readPostFormValues(formData);
  const id = toSafeId(postId);
  if (id === null) {
    return { status: "error", errors: {}, message: UNAVAILABLE, values };
  }

  // post_type is immutable; validate body + visibility only.
  const errors = validatePostInput(values);
  delete errors.postType;
  if (hasErrors(errors)) {
    return {
      status: "error",
      errors,
      message: "Check the highlighted fields.",
      values,
    };
  }

  const { supabase } = await requireCompletedProfile();
  const result = await updatePost(supabase, {
    postId: id,
    body: normalizePostBody(values.body),
    visibility: values.visibility,
  });

  if (result.status === "error") {
    return {
      status: "error",
      errors: {},
      message: result.reason === "not_available" ? UNAVAILABLE : GENERIC,
      values,
    };
  }

  revalidatePost(id);
  redirect(`/posts/${id}`);
}

export async function deletePostAction(
  postId: number,
  previousState: DeletePostState,
): Promise<DeletePostState> {
  const id = toSafeId(postId);
  if (id === null) {
    return { ...previousState, status: "error", message: UNAVAILABLE };
  }

  const { supabase } = await requireCompletedProfile();
  const result = await softDeletePost(supabase, id);
  if (result.status === "error") {
    return {
      status: "error",
      message: result.reason === "not_available" ? UNAVAILABLE : GENERIC,
    };
  }

  revalidatePost(id);
  redirect("/feed");
}

// ---------------------------------------------------------------------------
// Post images (Pass 7). The browser has already uploaded the object directly
// to Storage under posts/{userId}/{postId}/... — this action only validates
// the path prefix and persists the attachment via attach_post_media(), which
// re-checks ownership, mime type, size and the 4-image ceiling itself. Used
// both right after createPost() resolves and when adding an image during
// edit — the RPC does not distinguish the two.
// ---------------------------------------------------------------------------

export async function attachPostMediaAction(
  postId: number,
  input: {
    storagePath: string;
    mimeType: string;
    sizeBytes: number;
    width: number | null;
    height: number | null;
    altText: string | null;
  },
): Promise<MediaActionResult> {
  const id = toSafeId(postId);
  if (id === null) return { status: "error", message: UNAVAILABLE };

  const { supabase, userId } = await requireCompletedProfile();

  const expectedPrefix = `posts/${userId}/${id}/`;
  if (!isOwnedPath(input.storagePath, expectedPrefix)) {
    return { status: "error", message: "This image cannot be attached." };
  }

  const result = await attachPostMedia(supabase, {
    postId: id,
    storagePath: input.storagePath,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    width: input.width,
    height: input.height,
    altText: input.altText,
  });

  if (result.status === "error") {
    await safeDeleteObject(supabase, input.storagePath);
    return {
      status: "error",
      message: result.reason === "invalid" ? "This image could not be added." : GENERIC,
    };
  }

  revalidatePost(id);
  return { status: "success", message: "Image added." };
}

/** Removes one of the caller's own images from a post, DB row first, then Storage. */
export async function removePostMediaAction(
  postId: number,
  mediaId: number,
): Promise<MediaActionResult> {
  const id = toSafeId(postId);
  if (id === null) return { status: "error", message: UNAVAILABLE };

  const { supabase } = await requireCompletedProfile();
  const result = await removePostMedia(supabase, mediaId);

  if (result.status === "error") {
    return {
      status: "error",
      message: result.reason === "not_available" ? "This image is not available." : GENERIC,
    };
  }

  await safeDeleteObject(supabase, result.data);
  revalidatePost(id);
  return { status: "success", message: "Image removed." };
}

// ---------------------------------------------------------------------------
// Profile "Load more" for one author's posts
// ---------------------------------------------------------------------------

export async function loadMoreUserPosts(
  authorId: string,
  cursor: string | null,
): Promise<{ posts: FeedPost[]; nextCursor: string | null }> {
  const { supabase } = await requireCompletedProfile();
  const page = await listUserPosts(supabase, authorId, {
    cursor: parseFeedCursor(cursor),
    limit: clampLimit(undefined),
  });
  return { posts: page.posts, nextCursor: page.nextCursor };
}
