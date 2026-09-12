import Link from "next/link";
import type { SocialProfile } from "@/src/lib/social/social-data";
import {
  followerLabel,
  followingLabel,
} from "@/src/lib/social/social-labels";
import { FollowButton } from "@/src/components/social/follow-button";
import { BlockButton } from "@/src/components/social/block-button";
import { ReportButton } from "@/src/components/social/report-button";
import { createReportAction } from "@/app/(protected)/reports/actions";
import { MessageButton } from "@/src/components/messages/message-button";
import {
  blockProfile,
  followProfile,
  messageProfile,
  unblockProfile,
  unfollowProfile,
} from "@/app/(protected)/profile/[username]/actions";

// The social block on a public profile: counts (linked to the lists) plus the
// controls that apply to the viewer. Server component — it binds the target id
// and username into the server actions so the browser never supplies them.
export function ProfileSocialPanel({ profile }: { profile: SocialProfile }) {
  if (profile.viewer_blocked) {
    return (
      <div className="mt-6 rounded-2xl border border-[#e4ded2] bg-[#f7f4ee] p-5">
        <p className="text-sm font-semibold text-[#3e4a41]">
          You blocked this account
        </p>
        <p className="mt-1 text-sm leading-6 text-[#5f6962]">
          You will not see their activity, and they cannot follow you. Follower
          and following details are hidden while the block is in place.
        </p>
        <div className="mt-4">
          <BlockButton
            key="blocked"
            blocked
            blockAction={blockProfile.bind(null, profile.id, profile.username)}
            unblockAction={unblockProfile.bind(
              null,
              profile.id,
              profile.username,
            )}
            displayName={profile.display_name}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-5">
      <SocialCounts profile={profile} />

      {profile.is_self ? (
        <Link
          href="/settings/profile"
          className="inline-flex min-h-11 items-center rounded-full border border-[#cfc8bb] px-5 text-sm font-semibold text-[#3e4a41] transition hover:bg-white"
        >
          Edit profile
        </Link>
      ) : (
        <div className="flex flex-wrap items-start gap-3">
          <FollowButton
            key={`follow-${profile.viewer_follows}`}
            following={profile.viewer_follows}
            followAction={followProfile.bind(
              null,
              profile.id,
              profile.username,
            )}
            unfollowAction={unfollowProfile.bind(
              null,
              profile.id,
              profile.username,
            )}
            displayName={profile.display_name}
          />
          <MessageButton
            key="message"
            action={messageProfile.bind(null, profile.id)}
            displayName={profile.display_name}
          />
          <BlockButton
            key="not-blocked"
            blocked={false}
            blockAction={blockProfile.bind(null, profile.id, profile.username)}
            unblockAction={unblockProfile.bind(
              null,
              profile.id,
              profile.username,
            )}
            displayName={profile.display_name}
          />
          <ReportButton
            action={createReportAction.bind(null, "profile", null, profile.id)}
          />
        </div>
      )}
    </div>
  );
}

function SocialCounts({ profile }: { profile: SocialProfile }) {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
      <Link
        href={`/profile/${profile.username}/followers`}
        className="font-semibold text-[#3e4a41] hover:underline"
      >
        {followerLabel(profile.follower_count)}
      </Link>
      <Link
        href={`/profile/${profile.username}/following`}
        className="font-semibold text-[#3e4a41] hover:underline"
      >
        {followingLabel(profile.following_count)}
      </Link>
    </div>
  );
}
