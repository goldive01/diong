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
import { isOwnedPath } from "@/src/lib/media/storage-paths";
import {
  safeDeleteObject,
  verifyUploadedImageSize,
} from "@/src/lib/media/storage-server";
import type { MediaActionResult } from "@/src/lib/media/media-action-result";

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

// ---------------------------------------------------------------------------
// Community avatar / cover (Pass 7). Owner-only: set_community_avatar() /
// set_community_cover() re-check ownership themselves (defence in depth), but
// the browser never even reaches this action for a non-owner since the
// upload control is only rendered for the owner. Same replace-then-delete
// ordering as the profile avatar/cover actions above.
// ---------------------------------------------------------------------------

type CommunitySlot = "avatar" | "cover";

async function updateCommunityImage(
  communityId: number,
  slug: string,
  slot: CommunitySlot,
  storagePath: string,
): Promise<MediaActionResult> {
  const { supabase, userId } = await requireCompletedProfile();

  const expectedPrefix = `communities/${userId}/${communityId}/${slot}/`;
  if (!isOwnedPath(storagePath, expectedPrefix)) {
    return { status: "error", message: "This image cannot be used." };
  }

  const sizeCheck = await verifyUploadedImageSize(
    supabase,
    storagePath,
    slot === "avatar" ? "community_avatar" : "community_cover",
  );
  if (!sizeCheck.ok) {
    await safeDeleteObject(supabase, storagePath);
    return { status: "error", message: sizeCheck.message };
  }

  const { data: current } = await supabase
    .from("communities")
    .select("avatar_path, cover_path")
    .eq("id", communityId)
    .maybeSingle();

  const { error } = await supabase.rpc(
    slot === "avatar" ? "set_community_avatar" : "set_community_cover",
    { p_community_id: communityId, p_storage_path: storagePath },
  );

  if (error) {
    await safeDeleteObject(supabase, storagePath);
    return {
      status: "error",
      message: `Your community ${slot} could not be saved. Try again.`,
    };
  }

  const oldPath = (slot === "avatar" ? current?.avatar_path : current?.cover_path) ?? null;
  if (oldPath && oldPath !== storagePath) {
    await safeDeleteObject(supabase, oldPath);
  }

  revalidateCommunity(slug);
  return {
    status: "success",
    message: slot === "avatar" ? "Community avatar updated." : "Community cover updated.",
  };
}

async function removeCommunityImage(
  communityId: number,
  slug: string,
  slot: CommunitySlot,
): Promise<MediaActionResult> {
  const { supabase } = await requireCompletedProfile();

  const { data: current } = await supabase
    .from("communities")
    .select("avatar_path, cover_path")
    .eq("id", communityId)
    .maybeSingle();

  const { error } = await supabase.rpc(
    slot === "avatar" ? "set_community_avatar" : "set_community_cover",
    { p_community_id: communityId, p_storage_path: null },
  );

  if (error) {
    return {
      status: "error",
      message: `Your community ${slot} could not be removed. Try again.`,
    };
  }

  const oldPath = slot === "avatar" ? current?.avatar_path : current?.cover_path;
  await safeDeleteObject(supabase, oldPath ?? null);
  revalidateCommunity(slug);
  return {
    status: "success",
    message: slot === "avatar" ? "Community avatar removed." : "Community cover removed.",
  };
}

export async function updateCommunityAvatarAction(
  communityId: number,
  slug: string,
  storagePath: string,
): Promise<MediaActionResult> {
  return updateCommunityImage(communityId, slug, "avatar", storagePath);
}

export async function removeCommunityAvatarAction(
  communityId: number,
  slug: string,
): Promise<MediaActionResult> {
  return removeCommunityImage(communityId, slug, "avatar");
}

export async function updateCommunityCoverAction(
  communityId: number,
  slug: string,
  storagePath: string,
): Promise<MediaActionResult> {
  return updateCommunityImage(communityId, slug, "cover", storagePath);
}

export async function removeCommunityCoverAction(
  communityId: number,
  slug: string,
): Promise<MediaActionResult> {
  return removeCommunityImage(communityId, slug, "cover");
}
