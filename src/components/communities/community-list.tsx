import Link from "next/link";
import type { CommunitySummary } from "@/src/lib/communities/community-data";
import { CommunityCard } from "@/src/components/communities/community-card";
import type { CommunityRole } from "@/src/types/database";

export type CommunityListPageProps = {
  communities: (CommunitySummary & {
    viewerRole?: CommunityRole;
    viewerJoined?: boolean;
  })[];
  page: number;
  hasPrevious: boolean;
  hasNext: boolean;
};

// A page-based list of communities (joined / discover / search), each
// rendered with CommunityCard. `pageParam` lets each section on /communities
// or /search own its own query-param name so sections page independently —
// same pattern as DiscoverPeopleList.
export function CommunityList({
  page,
  basePath,
  pageParam,
  extraParams,
  emptyText,
}: {
  page: CommunityListPageProps;
  basePath: string;
  pageParam: string;
  extraParams?: Record<string, string>;
  emptyText: string;
}) {
  if (page.communities.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-[#d8d1c4] px-4 py-8 text-center text-sm text-[#68716b]">
        {emptyText}
      </p>
    );
  }

  function hrefFor(targetPage: number): string {
    const params = new URLSearchParams(extraParams);
    params.set(pageParam, String(targetPage));
    return `${basePath}?${params.toString()}`;
  }

  return (
    <div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {page.communities.map((community) => (
          <li key={community.id}>
            <CommunityCard
              community={community}
              viewerRole={community.viewerRole}
              viewerJoined={community.viewerJoined}
            />
          </li>
        ))}
      </ul>

      {(page.hasPrevious || page.hasNext) && (
        <nav
          aria-label="Pagination"
          className="mt-6 flex items-center justify-between gap-4 text-sm font-semibold"
        >
          {page.hasPrevious ? (
            <Link
              href={hrefFor(page.page - 1)}
              className="text-[#59654a] hover:underline"
            >
              ← Previous
            </Link>
          ) : (
            <span className="text-[#b3b0a6]">← Previous</span>
          )}
          <span className="font-normal text-[#7a8378]">Page {page.page}</span>
          {page.hasNext ? (
            <Link
              href={hrefFor(page.page + 1)}
              className="text-[#59654a] hover:underline"
            >
              Next →
            </Link>
          ) : (
            <span className="text-[#b3b0a6]">Next →</span>
          )}
        </nav>
      )}
    </div>
  );
}
