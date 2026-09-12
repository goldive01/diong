import Link from "next/link";
import type { CommunitySummary } from "@/src/lib/communities/community-data";
import { memberCountLabel, roleLabel } from "@/src/lib/communities/community-labels";
import type { CommunityRole } from "@/src/types/database";

// One community card for /communities (joined + discover sections) and the
// Discover / Search integrations. Shows name, a short description, member
// count and the joined/not-joined state — no fake trending statistics.
export function CommunityCard({
  community,
  viewerRole,
  viewerJoined,
}: {
  community: CommunitySummary;
  /** Present on the "joined" list — the viewer's role in this community. */
  viewerRole?: CommunityRole;
  /** Present on discover/search results — whether the viewer has joined. */
  viewerJoined?: boolean;
}) {
  const joined = viewerRole !== undefined || viewerJoined === true;

  return (
    <Link
      href={`/communities/${community.slug}`}
      className="block rounded-2xl border border-[#e0dacd] bg-white p-4 transition hover:border-[#c7bfab] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f7b4f]/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-[#1d2420]">
            {community.name}
          </p>
          <p className="text-sm text-[#657052]">
            {memberCountLabel(community.memberCount)}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
            joined
              ? "bg-[#eef2e5] text-[#42512a]"
              : "border border-[#cfc8bb] text-[#4d574f]"
          }`}
        >
          {viewerRole ? roleLabel(viewerRole) : joined ? "Joined" : "Not joined"}
        </span>
      </div>

      {community.description && (
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#5f6962]">
          {community.description}
        </p>
      )}
    </Link>
  );
}
