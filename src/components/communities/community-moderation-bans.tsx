import type { CommunityBanEntry } from "@/src/lib/communities/community-data";
import { ModerationActionButton } from "@/src/components/communities/moderation-action-button";
import { unbanMemberAction } from "@/app/(protected)/communities/[slug]/moderation/actions";

// Banned-user list for /communities/[slug]/moderation. Unbanning does not
// restore membership — the user may join again through the normal Join flow.
export function CommunityModerationBans({
  communityId,
  slug,
  bans,
}: {
  communityId: number;
  slug: string;
  bans: CommunityBanEntry[];
}) {
  if (bans.length === 0) {
    return <p className="text-sm text-[#68716b]">No one is banned.</p>;
  }

  return (
    <ul className="divide-y divide-[#ece7de] rounded-2xl border border-[#e0dacd] bg-white">
      {bans.map((ban) => (
        <li
          key={ban.userId}
          className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
        >
          <div className="min-w-0">
            <p className="font-semibold text-[#1d2420]">{ban.displayName}</p>
            <p className="text-sm text-[#657052]">
              @{ban.username}
              {ban.reason ? ` · ${ban.reason}` : ""}
            </p>
          </div>
          <ModerationActionButton
            action={unbanMemberAction.bind(null, communityId, slug, ban.userId)}
            label="Unban"
            pendingLabel="Unbanning…"
          />
        </li>
      ))}
    </ul>
  );
}
