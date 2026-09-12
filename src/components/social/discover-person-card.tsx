import Link from "next/link";
import type { DiscoverPerson } from "@/src/lib/social/discover-data";
import type { SearchPerson } from "@/src/lib/social/search-data";
import { truncateBio } from "@/src/lib/social/social-labels";
import { sharedInterestLabel } from "@/src/lib/social/discover-labels";
import { FollowButton } from "@/src/components/social/follow-button";
import {
  followProfile,
  unfollowProfile,
} from "@/app/(protected)/profile/[username]/actions";

// A person card for Discover / Search: display name, @username, a short bio,
// shared interests when known, a Follow control and a link to the profile.
// Reuses the existing FollowButton + followProfile/unfollowProfile server
// actions — no separate follow semantics are introduced here.
export function DiscoverPersonCard({
  person,
}: {
  person: (DiscoverPerson | SearchPerson) & { sharedInterestCount?: number };
}) {
  // FollowButton owns its own local state from this initial value; if it
  // changes remotely between page loads the parent list re-renders on the
  // next navigation, same as the profile page's ProfileSocialPanel.
  const bio = truncateBio(person.bio);
  const sharedLabel = sharedInterestLabel(person.sharedInterestCount);

  return (
    <div className="rounded-2xl border border-[#e0dacd] bg-white p-4">
      <div className="flex items-start gap-3">
        <Link
          href={`/profile/${person.username}`}
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#dfe6d2] text-sm font-semibold text-[#465331] outline-none focus-visible:ring-2 focus-visible:ring-[#6f7b4f]/40"
          aria-hidden="true"
          tabIndex={-1}
        >
          {person.displayName.charAt(0).toUpperCase()}
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            href={`/profile/${person.username}`}
            className="block truncate font-semibold text-[#1d2420] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f7b4f]/40"
          >
            {person.displayName}
          </Link>
          <p className="truncate text-sm text-[#657052]">@{person.username}</p>
          {bio && (
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#5f6962]">
              {bio}
            </p>
          )}
          {sharedLabel && (
            <p className="mt-1 text-xs font-semibold text-[#6f7b4f]">
              {sharedLabel}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3">
        <FollowButton
          key={`follow-${person.id}-${person.viewerFollows}`}
          following={person.viewerFollows}
          followAction={followProfile.bind(null, person.id, person.username)}
          unfollowAction={unfollowProfile.bind(null, person.id, person.username)}
          displayName={person.displayName}
        />
      </div>
    </div>
  );
}
