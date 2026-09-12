"use server";

import { revalidatePath } from "next/cache";
import { requireCompletedProfile } from "@/src/lib/auth";
import {
  banCommunityMember,
  demoteCommunityModerator,
  promoteCommunityModerator,
  removeCommunityMember,
  removeCommunityPost,
  unbanCommunityMember,
} from "@/src/lib/communities/community-mutations";
import {
  INITIAL_MODERATION_ACTION_STATE,
  type ModerationActionState,
} from "@/src/lib/communities/community-form-state";
import { communityErrorMessage } from "@/src/lib/communities/community-labels";

// Every export in this "use server" module is an async server action. The
// community id, slug and every target id are always bound as leading server
// arguments by the moderation page — never form fields — so the browser can
// neither choose nor spoof who/what is being moderated. Authority is
// re-checked by the database RPC regardless (owner/moderator role,
// never-the-owner, moderator-cannot-target-moderator).

function readReason(formData: FormData): string | null {
  const value = formData.get("reason");
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function revalidateCommunity(slug: string) {
  revalidatePath(`/communities/${slug}`);
  revalidatePath(`/communities/${slug}/members`);
  revalidatePath(`/communities/${slug}/moderation`);
}

// promoteModeratorAction / demoteModeratorAction / removeMemberAction /
// unbanMemberAction take no previous-state / formData parameters (unlike
// banMemberAction / removePostAction below, which read an optional reason
// from formData) — a bare action button has no prior state to read back and
// no fields to submit. A function with fewer parameters is still assignable
// to ModerationActionButton's two-argument action type, the same idiom
// messageProfile() (profile/[username]/actions.ts) already uses.
export async function promoteModeratorAction(
  communityId: number,
  slug: string,
  userId: string,
): Promise<ModerationActionState> {
  const { supabase } = await requireCompletedProfile();
  const result = await promoteCommunityModerator(supabase, communityId, userId);
  if (result.status === "error") {
    return { status: "error", message: communityErrorMessage(result.reason) };
  }
  revalidateCommunity(slug);
  return INITIAL_MODERATION_ACTION_STATE;
}

export async function demoteModeratorAction(
  communityId: number,
  slug: string,
  userId: string,
): Promise<ModerationActionState> {
  const { supabase } = await requireCompletedProfile();
  const result = await demoteCommunityModerator(supabase, communityId, userId);
  if (result.status === "error") {
    return { status: "error", message: communityErrorMessage(result.reason) };
  }
  revalidateCommunity(slug);
  return INITIAL_MODERATION_ACTION_STATE;
}

export async function removeMemberAction(
  communityId: number,
  slug: string,
  userId: string,
): Promise<ModerationActionState> {
  const { supabase } = await requireCompletedProfile();
  const result = await removeCommunityMember(supabase, communityId, userId);
  if (result.status === "error") {
    return { status: "error", message: communityErrorMessage(result.reason) };
  }
  revalidateCommunity(slug);
  return INITIAL_MODERATION_ACTION_STATE;
}

export async function banMemberAction(
  communityId: number,
  slug: string,
  userId: string,
  _previousState: ModerationActionState,
  formData: FormData,
): Promise<ModerationActionState> {
  const { supabase } = await requireCompletedProfile();
  const result = await banCommunityMember(supabase, {
    communityId,
    userId,
    reason: readReason(formData),
  });
  if (result.status === "error") {
    return { status: "error", message: communityErrorMessage(result.reason) };
  }
  revalidateCommunity(slug);
  return INITIAL_MODERATION_ACTION_STATE;
}

export async function unbanMemberAction(
  communityId: number,
  slug: string,
  userId: string,
): Promise<ModerationActionState> {
  const { supabase } = await requireCompletedProfile();
  const result = await unbanCommunityMember(supabase, communityId, userId);
  if (result.status === "error") {
    return { status: "error", message: communityErrorMessage(result.reason) };
  }
  revalidateCommunity(slug);
  return INITIAL_MODERATION_ACTION_STATE;
}

export async function removePostAction(
  communityId: number,
  slug: string,
  postId: number,
  _previousState: ModerationActionState,
  formData: FormData,
): Promise<ModerationActionState> {
  const { supabase } = await requireCompletedProfile();
  const result = await removeCommunityPost(supabase, {
    communityId,
    postId,
    reason: readReason(formData),
  });
  if (result.status === "error") {
    return { status: "error", message: communityErrorMessage(result.reason) };
  }
  revalidateCommunity(slug);
  return INITIAL_MODERATION_ACTION_STATE;
}
