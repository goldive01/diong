"use client";

import { useActionState } from "react";
import {
  initialFollowState,
  type FollowActionState,
} from "@/src/lib/social/social-form-state";

type FollowAction = (
  state: FollowActionState,
  formData: FormData,
) => Promise<FollowActionState>;

// One button that follows or unfollows depending on the current relationship.
// The parent binds both actions (with the target id + username bound on the
// server) and re-keys this component when the server-rendered relationship
// changes, so `useActionState`'s local state never drifts from the page.
export function FollowButton({
  following,
  followAction,
  unfollowAction,
  displayName,
}: {
  following: boolean;
  followAction: FollowAction;
  unfollowAction: FollowAction;
  displayName: string;
}) {
  const action: FollowAction = (state, formData) =>
    (state.following ? unfollowAction : followAction)(state, formData);

  const [state, formAction, pending] = useActionState(
    action,
    initialFollowState(following),
  );

  return (
    <div>
      <form action={formAction}>
        <button
          type="submit"
          disabled={pending}
          aria-label={
            state.following
              ? `Unfollow ${displayName}`
              : `Follow ${displayName}`
          }
          className={`min-h-11 rounded-full px-5 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
            state.following
              ? "border border-[#cfc8bb] text-[#3e4a41] hover:bg-white focus-visible:ring-[#cfc8bb]"
              : "bg-[#263b2d] text-white hover:bg-[#1d3024] focus-visible:ring-[#263b2d]"
          }`}
        >
          {pending
            ? "Working…"
            : state.following
              ? "Following"
              : "Follow"}
        </button>
      </form>
      {state.status === "error" && state.message && (
        <p role="alert" className="mt-2 text-sm text-[#9b3f37]">
          {state.message}
        </p>
      )}
    </div>
  );
}
