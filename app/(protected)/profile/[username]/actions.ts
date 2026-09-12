"use server";

import { revalidatePath } from "next/cache";
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
