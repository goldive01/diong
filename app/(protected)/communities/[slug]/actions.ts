"use server";

import { revalidatePath } from "next/cache";
import { requireCompletedProfile } from "@/src/lib/auth";
import {
  createCommunityPost,
  joinCommunity,
  leaveCommunity,
} from "@/src/lib/communities/community-mutations";
import { listCommunityPosts } from "@/src/lib/communities/community-data";
import { communityErrorMessage } from "@/src/lib/communities/community-labels";
import type { CommunityMembershipState } from "@/src/lib/communities/community-form-state";
import {
  readCommunityPostFormValues,
  type CommunityPostFormState,
} from "@/src/lib/communities/community-form-state";
import { normalizePostBody } from "@/src/lib/social/post-validation";
import type { FeedPost } from "@/src/lib/social/post-data";
import {
  clampLimit,
  parseCommunityPostCursor,
} from "@/src/lib/communities/community-pagination";

// Every export in this "use server" module is an async server action. The
// community id / slug are always bound as leading server arguments by the
// community page — never form fields.

function revalidateCommunity(slug: string) {
  revalidatePath(`/communities`);
  revalidatePath(`/communities/${slug}`);
  revalidatePath(`/communities/${slug}/members`);
}

export async function joinCommunityAction(
  communityId: number,
  slug: string,
  previousState: CommunityMembershipState,
): Promise<CommunityMembershipState> {
  const { supabase } = await requireCompletedProfile();
  const result = await joinCommunity(supabase, communityId);
  if (result.status === "error") {
    return {
      status: "error",
      joined: previousState.joined,
      message: communityErrorMessage(
        result.reason === "not_available" ? "not_available" : "unknown",
      ),
    };
  }
  revalidateCommunity(slug);
  return { status: "success", joined: true, message: "" };
}

export async function leaveCommunityAction(
  communityId: number,
  slug: string,
  previousState: CommunityMembershipState,
): Promise<CommunityMembershipState> {
  const { supabase } = await requireCompletedProfile();
  const result = await leaveCommunity(supabase, communityId);
  if (result.status === "error") {
    return {
      status: "error",
      joined: previousState.joined,
      message: result.message ?? communityErrorMessage("unknown"),
    };
  }
  revalidateCommunity(slug);
  return { status: "success", joined: false, message: "" };
}

export async function createCommunityPostAction(
  communityId: number,
  slug: string,
  _previousState: CommunityPostFormState,
  formData: FormData,
): Promise<CommunityPostFormState> {
  const values = readCommunityPostFormValues(formData);
  const body = normalizePostBody(values.body);

  const { supabase } = await requireCompletedProfile();
  const result = await createCommunityPost(supabase, {
    communityId,
    postType: values.postType,
    body,
  });

  if (result.status === "error") {
    return {
      status: "error",
      message: communityErrorMessage(
        result.reason === "slug_taken" ? "unknown" : result.reason,
      ),
      values,
    };
  }

  revalidatePath(`/communities/${slug}`);
  return {
    status: "success",
    message: "",
    values: { ...values, body: "" },
    createdPostId: result.data,
  };
}

/** Client "Load more" for a community's post feed. */
export async function loadMoreCommunityPosts(
  communityId: number,
  cursor: string | null,
): Promise<{ posts: FeedPost[]; nextCursor: string | null }> {
  const { supabase } = await requireCompletedProfile();
  const page = await listCommunityPosts(supabase, communityId, {
    cursor: parseCommunityPostCursor(cursor),
    limit: clampLimit(undefined),
  });
  return { posts: page.posts, nextCursor: page.nextCursor };
}
