"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCompletedProfile } from "@/src/lib/auth";
import { checkSocialTarget } from "@/src/lib/social/social-validation";
import {
  blockUser,
  followUser,
  unblockUser,
  unfollowUser,
} from "@/src/lib/social/social-mutations";
import type {
  BlockActionState,
  FollowActionState,
} from "@/src/lib/social/social-form-state";
import { getOrCreateConversation } from "@/src/lib/messages/message-mutations";
import type { MessageButtonState } from "@/src/lib/messages/message-form-state";

// Every export in this "use server" module is an async server action.
//
// The target user id and username are bound as leading arguments on the server
// by the profile page — they are never form fields and can neither be read nor
// changed by the browser. The acting user always comes from
// requireCompletedProfile() (auth.uid() server-side); the RPCs re-derive it
// too. Raw Supabase / Postgres text is never returned to the client.

const NOT_AVAILABLE = "This account is not available.";
const GENERIC = "Something went wrong. Please try again.";

function revalidateSocial(username: string, viewerUsername: string | null) {
  revalidatePath(`/profile/${username}`);
  revalidatePath(`/profile/${username}/followers`);
  revalidatePath(`/profile/${username}/following`);
  if (viewerUsername && viewerUsername !== username) {
    revalidatePath(`/profile/${viewerUsername}`);
    revalidatePath(`/profile/${viewerUsername}/following`);
  }
}

async function runFollowMutation(
  direction: "follow" | "unfollow",
  targetUserId: string,
  username: string,
  previousState: FollowActionState,
): Promise<FollowActionState> {
  const { supabase, userId, profile } = await requireCompletedProfile();

  if (checkSocialTarget(userId, targetUserId) !== null) {
    return { status: "error", following: previousState.following, message: NOT_AVAILABLE };
  }

  const result =
    direction === "follow"
      ? await followUser(supabase, targetUserId)
      : await unfollowUser(supabase, targetUserId);

  if (result.status === "error") {
    return {
      status: "error",
      following: previousState.following,
      message: result.reason === "not_available" ? NOT_AVAILABLE : GENERIC,
    };
  }

  revalidateSocial(username, profile.username);
  return { status: "success", following: direction === "follow", message: "" };
}

export async function followProfile(
  targetUserId: string,
  username: string,
  previousState: FollowActionState,
): Promise<FollowActionState> {
  return runFollowMutation("follow", targetUserId, username, previousState);
}

export async function unfollowProfile(
  targetUserId: string,
  username: string,
  previousState: FollowActionState,
): Promise<FollowActionState> {
  return runFollowMutation("unfollow", targetUserId, username, previousState);
}

async function runBlockMutation(
  direction: "block" | "unblock",
  targetUserId: string,
  username: string,
  previousState: BlockActionState,
): Promise<BlockActionState> {
  const { supabase, userId, profile } = await requireCompletedProfile();

  if (checkSocialTarget(userId, targetUserId) !== null) {
    return { status: "error", blocked: previousState.blocked, message: NOT_AVAILABLE };
  }

  const result =
    direction === "block"
      ? await blockUser(supabase, targetUserId)
      : await unblockUser(supabase, targetUserId);

  if (result.status === "error") {
    return {
      status: "error",
      blocked: previousState.blocked,
      message: result.reason === "not_available" ? NOT_AVAILABLE : GENERIC,
    };
  }

  revalidateSocial(username, profile.username);
  return { status: "success", blocked: direction === "block", message: "" };
}

export async function blockProfile(
  targetUserId: string,
  username: string,
  previousState: BlockActionState,
): Promise<BlockActionState> {
  return runBlockMutation("block", targetUserId, username, previousState);
}

export async function unblockProfile(
  targetUserId: string,
  username: string,
  previousState: BlockActionState,
): Promise<BlockActionState> {
  return runBlockMutation("unblock", targetUserId, username, previousState);
}

// Direct messages (Social Network Pass 4). On success this redirects straight
// to the (possibly newly created) conversation rather than returning a
// "success" state — the same shape createConnection() (connections/actions.ts)
// already uses for a create-then-navigate action. Takes no previous-state /
// formData parameters (unlike the toggles above) since a "Message" click has
// no prior relationship state to read back — a function with fewer
// parameters is still assignable to MessageButton's two-argument action type.
export async function messageProfile(
  targetUserId: string,
): Promise<MessageButtonState> {
  const { supabase, userId } = await requireCompletedProfile();

  if (checkSocialTarget(userId, targetUserId) !== null) {
    return { status: "error", message: NOT_AVAILABLE };
  }

  const result = await getOrCreateConversation(supabase, targetUserId);

  if (result.status === "error") {
    return {
      status: "error",
      message: result.reason === "not_available" ? NOT_AVAILABLE : GENERIC,
    };
  }

  redirect(`/messages/${result.data}`);
}
