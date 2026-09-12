import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCompletedProfile } from "@/src/lib/auth";
import {
  getCommunity,
  listCommunityMembers,
} from "@/src/lib/communities/community-data";
import { parsePageNumber } from "@/src/lib/communities/community-pagination";
import { CommunityMembersList } from "@/src/components/communities/community-members-list";

export const metadata = {
  title: "Community members",
};

export default async function CommunityMembersPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const { supabase } = await requireCompletedProfile();
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = parsePageNumber(pageParam);

  const community = await getCommunity(supabase, decodeURIComponent(slug));
  if (!community) notFound();

  const members = await listCommunityMembers(supabase, community.id, page);

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-6 sm:py-14">
      <Link
        href={`/communities/${slug}`}
        className="text-sm font-semibold text-[#59654a] hover:underline"
      >
        ← Back to {community.name}
      </Link>

      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Members</h1>

      <div className="mt-6">
        <CommunityMembersList
          members={members.members}
          emptyText="No members yet."
        />
      </div>

      {(members.hasPrevious || members.hasNext) && (
        <nav
          aria-label="Pagination"
          className="mt-6 flex items-center justify-between gap-4 text-sm font-semibold"
        >
          {members.hasPrevious ? (
            <Link
              href={`/communities/${slug}/members?page=${members.page - 1}`}
              className="text-[#59654a] hover:underline"
            >
              ← Previous
            </Link>
          ) : (
            <span className="text-[#b3b0a6]">← Previous</span>
          )}
          <span className="font-normal text-[#7a8378]">Page {members.page}</span>
          {members.hasNext ? (
            <Link
              href={`/communities/${slug}/members?page=${members.page + 1}`}
              className="text-[#59654a] hover:underline"
            >
              Next →
            </Link>
          ) : (
            <span className="text-[#b3b0a6]">Next →</span>
          )}
        </nav>
      )}
    </main>
  );
}
