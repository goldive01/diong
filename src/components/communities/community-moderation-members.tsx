import Link from "next/link";
import type { CommunityMember } from "@/src/lib/communities/community-data";
import { roleLabel } from "@/src/lib/communities/community-labels";
import { ModerationActionButton } from "@/src/components/communities/moderation-action-button";
import {
  banMemberAction,
  demoteModeratorAction,
  promoteModeratorAction,
  removeMemberAction,
} from "@/app/(protected)/communities/[slug]/moderation/actions";

// Member management for /communities/[slug]/moderation. Every capability
// here is re-checked by the database RPC (never-the-owner,
// moderator-cannot-target-moderator) — this component only decides which
// buttons are worth *showing* for a calmer UI; it is not the authority.
export function CommunityModerationMembers({
  communityId,
  slug,
  members,
  viewerRole,
}: {
  communityId: number;
  slug: string;
  members: CommunityMember[];
  viewerRole: "owner" | "moderator";
}) {
  return (
    <ul className="divide-y divide-[#ece7de] rounded-2xl border border-[#e0dacd] bg-white">
      {members.map((member) => {
        const canManage =
          member.role !== "owner" &&
          (viewerRole === "owner" || member.role === "member");
        return (
          <li
            key={member.userId}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
          >
            <div className="min-w-0">
              <Link
                href={`/profile/${member.username}`}
                className="font-semibold text-[#1d2420] hover:underline"
              >
                {member.displayName}
              </Link>
              <p className="text-sm text-[#657052]">
                @{member.username} · {roleLabel(member.role)}
              </p>
            </div>

            {canManage && (
              <div className="flex flex-wrap items-center gap-2">
                {viewerRole === "owner" && member.role === "member" && (
                  <ModerationActionButton
                    action={promoteModeratorAction.bind(
                      null,
                      communityId,
                      slug,
                      member.userId,
                    )}
                    label="Promote"
                    pendingLabel="Promoting…"
                  />
                )}
                {viewerRole === "owner" && member.role === "moderator" && (
                  <ModerationActionButton
                    action={demoteModeratorAction.bind(
                      null,
                      communityId,
                      slug,
                      member.userId,
                    )}
                    label="Demote"
                    pendingLabel="Demoting…"
                  />
                )}
                <ModerationActionButton
                  action={removeMemberAction.bind(
                    null,
                    communityId,
                    slug,
                    member.userId,
                  )}
                  label="Remove"
                  pendingLabel="Removing…"
                  confirmText={`Remove ${member.displayName} from this community?`}
                  destructive
                />
                <ModerationActionButton
                  action={banMemberAction.bind(
                    null,
                    communityId,
                    slug,
                    member.userId,
                  )}
                  label="Ban"
                  pendingLabel="Banning…"
                  confirmText={`Ban ${member.displayName}? They will not be able to rejoin until unbanned.`}
                  destructive
                  reasonField
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
