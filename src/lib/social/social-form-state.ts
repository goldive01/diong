// Plain (non-"use server") module. Holds the action-state shapes for the social
// buttons and their initial-state builders. Runtime values cannot be exported
// from a "use server" file, so they live here and are imported by both the
// server actions and the client button components.

export type SocialActionStatus = "idle" | "success" | "error";

// The relationship AFTER the last action, so a client button can reflect the
// change immediately while route revalidation happens in the background.
export type FollowActionState = {
  status: SocialActionStatus;
  following: boolean;
  message: string;
};

export type BlockActionState = {
  status: SocialActionStatus;
  blocked: boolean;
  message: string;
};

export function initialFollowState(following: boolean): FollowActionState {
  return { status: "idle", following, message: "" };
}

export function initialBlockState(blocked: boolean): BlockActionState {
  return { status: "idle", blocked, message: "" };
}
