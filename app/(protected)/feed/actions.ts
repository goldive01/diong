"use server";

import { revalidatePath } from "next/cache";
import { requireCompletedProfile } from "@/src/lib/auth";
import { listFeedPosts, type FeedPost } from "@/src/lib/social/post-data";
import { createPost as createPostRpc } from "@/src/lib/social/post-mutations";
import {
  clampLimit,
  hasErrors,
  normalizePostBody,
  parseFeedCursor,
  validatePostInput,
} from "@/src/lib/social/post-validation";
import {
  EMPTY_POST_FORM,
  readPostFormValues,
  type PostFormState,
} from "@/src/lib/social/post-form-state";

// Every export in this "use server" module is an async server action. user_id is
// always derived from requireCompletedProfile() (auth.uid() server-side); the
// RPCs re-derive it too. Raw Supabase / Postgres text is never returned.

const GENERIC = "Something went wrong. Please try again.";

export async function createPost(
  _previousState: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  const values = readPostFormValues(formData);
  const errors = validatePostInput(values);

  if (hasErrors(errors)) {
    return {
      status: "error",
      errors,
      message: "Check the highlighted fields.",
      values,
    };
  }

  const { supabase } = await requireCompletedProfile();
  const result = await createPostRpc(supabase, {
    postType: values.postType,
    body: normalizePostBody(values.body),
    visibility: values.visibility,
  });

  if (result.status === "error") {
    return {
      status: "error",
      errors: {},
      message:
        result.reason === "not_available"
          ? "This account is not available."
          : GENERIC,
      values,
    };
  }

  revalidatePath("/feed");
  return {
    status: "success",
    errors: {},
    message: "Shared.",
    values: { ...EMPTY_POST_FORM, postType: values.postType, visibility: values.visibility },
    createdPostId: result.data,
  };
}

export type FeedBatch = { posts: FeedPost[]; nextCursor: string | null };

/** Client "Load more": the next page after `cursor`. */
export async function loadMoreFeed(
  cursor: string | null,
): Promise<FeedBatch> {
  const { supabase } = await requireCompletedProfile();
  const page = await listFeedPosts(supabase, {
    cursor: parseFeedCursor(cursor),
    limit: clampLimit(undefined),
  });
  return { posts: page.posts, nextCursor: page.nextCursor };
}
