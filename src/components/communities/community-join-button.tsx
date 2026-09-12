"use client";

import { useActionState } from "react";
import {
  initialCommunityMembershipState,
  type CommunityMembershipState,
} from "@/src/lib/communities/community-form-state";

type MembershipAction = (
  state: CommunityMembershipState,
  formData: FormData,
) => Promise<CommunityMembershipState>;

// Join / leave toggle for a community. Not rendered for the owner (an owner
// can never leave in V1 — the page that uses this shows an "Owner" badge
// instead). Mirrors FollowButton's useActionState toggle shape.
export function CommunityJoinButton({
  joined,
  joinAction,
  leaveAction,
  communityName,
}: {
  joined: boolean;
  joinAction: MembershipAction;
  leaveAction: MembershipAction;
  communityName: string;
}) {
  const action: MembershipAction = (state, formData) =>
    (state.joined ? leaveAction : joinAction)(state, formData);

  const [state, formAction, pending] = useActionState(
    action,
    initialCommunityMembershipState(joined),
  );

  return (
    <div>
      <form action={formAction}>
        <button
          type="submit"
          disabled={pending}
          aria-label={
            state.joined ? `Leave ${communityName}` : `Join ${communityName}`
          }
          className={`min-h-11 rounded-full px-5 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
            state.joined
              ? "border border-[#cfc8bb] text-[#3e4a41] hover:bg-white focus-visible:ring-[#cfc8bb]"
              : "bg-[#263b2d] text-white hover:bg-[#1d3024] focus-visible:ring-[#263b2d]"
          }`}
        >
          {pending ? "Working…" : state.joined ? "Joined" : "Join"}
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
