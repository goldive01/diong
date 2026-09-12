import Link from "next/link";
import type { CommunityMember } from "@/src/lib/communities/community-data";
import { roleLabel } from "@/src/lib/communities/community-labels";

// Read-only member list for /communities/[slug]/members. Only public profile
// fields (username, display name, role, joined date) — never email or auth
// metadata. Grouped visually by role rank via a badge (the RPC already
// orders owner, then moderators, then members).
export function CommunityMembersList({
  members,
  emptyText,
}: {
  members: CommunityMember[];
  emptyText: string;
}) {
  if (members.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-[#d8d1c4] px-4 py-8 text-center text-sm text-[#68716b]">
        {emptyText}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-[#ece7de] rounded-2xl border border-[#e0dacd] bg-white">
      {members.map((member) => (
        <li
          key={member.userId}
          className="flex items-center justify-between gap-3 px-4 py-3"
        >
          <Link
            href={`/profile/${member.username}`}
            className="min-w-0 font-semibold text-[#1d2420] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f7b4f]/40"
          >
            <span className="block truncate">{member.displayName}</span>
            <span className="block truncate text-sm font-normal text-[#657052]">
              @{member.username}
            </span>
          </Link>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
              member.role === "owner"
                ? "bg-[#eef2e5] text-[#42512a]"
                : member.role === "moderator"
                  ? "bg-[#f1ede3] text-[#6b6350]"
                  : "border border-[#cfc8bb] text-[#4d574f]"
            }`}
          >
            {roleLabel(member.role)}
          </span>
        </li>
      ))}
    </ul>
  );
}
