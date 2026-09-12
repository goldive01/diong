import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCompletedProfile } from "@/src/lib/auth";
import {
  getCommunity,
  listCommunityBans,
  listCommunityMembers,
  listCommunityModerationReports,
  listCommunityPosts,
} from "@/src/lib/communities/community-data";
import { parsePageNumber } from "@/src/lib/communities/community-pagination";
import { CommunityModerationMembers } from "@/src/components/communities/community-moderation-members";
import { CommunityModerationBans } from "@/src/components/communities/community-moderation-bans";
import { CommunityModerationPostRow } from "@/src/components/communities/community-moderation-post-row";
import { CommunityModerationReports } from "@/src/components/communities/community-moderation-reports";

export const metadata = {
  title: "Community moderation",
};

export default async function CommunityModerationPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ membersPage?: string | string[] }>;
}) {
  const { supabase } = await requireCompletedProfile();
  const { slug } = await params;
  const { membersPage: membersPageParam } = await searchParams;
  const membersPage = parsePageNumber(membersPageParam);

  const community = await getCommunity(supabase, decodeURIComponent(slug));
  if (!community) notFound();

  // Only the owner or a moderator may reach this page. Every other visitor —
  // including a signed-in member — sees the same branded 404 as a missing
  // community, matching the repo's "safe unauthorized behaviour" convention.
  if (community.viewerRole !== "owner" && community.viewerRole !== "moderator") {
    notFound();
  }
  const viewerRole = community.viewerRole;

  const [members, bans, reports, posts] = await Promise.all([
    listCommunityMembers(supabase, community.id, membersPage),
    listCommunityBans(supabase, community.id),
    listCommunityModerationReports(supabase, community.id),
    listCommunityPosts(supabase, community.id, { limit: 20 }),
  ]);

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-6 sm:py-14">
      <Link
        href={`/communities/${slug}`}
        className="text-sm font-semibold text-[#59654a] hover:underline"
      >
        ← Back to {community.name}
      </Link>

      <h1 className="mt-4 text-3xl font-semibold tracking-tight">
        Moderation
      </h1>
      <p className="mt-2 leading-7 text-[#5f6962]">
        Only visible to the owner and moderators of {community.name}.
      </p>

      <section aria-labelledby="moderation-members-heading" className="mt-8">
        <h2
          id="moderation-members-heading"
          className="mb-3 text-lg font-semibold"
        >
          Members
        </h2>
        <CommunityModerationMembers
          communityId={community.id}
          slug={slug}
          members={members.members}
          viewerRole={viewerRole}
        />
        {(members.hasPrevious || members.hasNext) && (
          <nav
            aria-label="Members pagination"
            className="mt-4 flex items-center justify-between gap-4 text-sm font-semibold"
          >
            {members.hasPrevious ? (
              <Link
                href={`/communities/${slug}/moderation?membersPage=${members.page - 1}`}
                className="text-[#59654a] hover:underline"
              >
                ← Previous
              </Link>
            ) : (
              <span className="text-[#b3b0a6]">← Previous</span>
            )}
            <span className="font-normal text-[#7a8378]">
              Page {members.page}
            </span>
            {members.hasNext ? (
              <Link
                href={`/communities/${slug}/moderation?membersPage=${members.page + 1}`}
                className="text-[#59654a] hover:underline"
              >
                Next →
              </Link>
            ) : (
              <span className="text-[#b3b0a6]">Next →</span>
            )}
          </nav>
        )}
      </section>

      <section aria-labelledby="moderation-bans-heading" className="mt-10">
        <h2 id="moderation-bans-heading" className="mb-3 text-lg font-semibold">
          Banned
        </h2>
        <CommunityModerationBans
          communityId={community.id}
          slug={slug}
          bans={bans}
        />
      </section>

      <section aria-labelledby="moderation-posts-heading" className="mt-10">
        <h2 id="moderation-posts-heading" className="mb-3 text-lg font-semibold">
          Recent posts
        </h2>
        {posts.posts.length === 0 ? (
          <p className="text-sm text-[#68716b]">No posts yet.</p>
        ) : (
          <ul className="space-y-4">
            {posts.posts.map((post) => (
              <li key={post.id}>
                <CommunityModerationPostRow
                  communityId={community.id}
                  slug={slug}
                  post={post}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="moderation-reports-heading" className="mt-10">
        <h2
          id="moderation-reports-heading"
          className="mb-3 text-lg font-semibold"
        >
          Reports
        </h2>
        <CommunityModerationReports reports={reports} />
      </section>
    </main>
  );
}
