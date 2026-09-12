import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCompletedProfile } from "@/src/lib/auth";
import { getCommunity, listCommunityPosts } from "@/src/lib/communities/community-data";
import { memberCountLabel, roleLabel } from "@/src/lib/communities/community-labels";
import { CommunityJoinButton } from "@/src/components/communities/community-join-button";
import { CommunityPostComposer } from "@/src/components/communities/community-post-composer";
import { ReportButton } from "@/src/components/social/report-button";
import { PostFeed } from "@/src/components/social/post-feed";
import { createReportAction } from "@/app/(protected)/reports/actions";
import {
  createCommunityPostAction,
  joinCommunityAction,
  leaveCommunityAction,
  loadMoreCommunityPosts,
} from "@/app/(protected)/communities/[slug]/actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return { title: decodeURIComponent(slug) };
}

export default async function CommunityDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { supabase } = await requireCompletedProfile();
  const { slug } = await params;

  // get_community() returns no row for a missing or inactive community —
  // collapses to a branded 404, matching posts/[id]/page.tsx's convention.
  const community = await getCommunity(supabase, decodeURIComponent(slug));
  if (!community) notFound();

  const posts = await listCommunityPosts(supabase, community.id, { limit: 20 });

  const isOwner = community.viewerRole === "owner";
  const isModerator = community.viewerRole === "moderator";
  const isMember = community.viewerRole !== null;

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-6 sm:py-14">
      <Link
        href="/communities"
        className="text-sm font-semibold text-[#59654a] hover:underline"
      >
        ← Back to Communities
      </Link>

      <section className="mt-4 rounded-3xl border border-[#ded7c9] bg-white p-6 sm:p-9">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {community.name}
            </h1>
            <p className="mt-1 text-sm text-[#657052]">
              {memberCountLabel(community.memberCount)} · Owned by{" "}
              <Link
                href={`/profile/${community.ownerUsername}`}
                className="font-semibold hover:underline"
              >
                {community.ownerDisplayName}
              </Link>
            </p>
          </div>

          {isOwner ? (
            <span className="min-h-11 rounded-full bg-[#eef2e5] px-5 py-2.5 text-sm font-semibold text-[#42512a]">
              {roleLabel("owner")}
            </span>
          ) : (
            <CommunityJoinButton
              joined={isMember}
              joinAction={joinCommunityAction.bind(null, community.id, slug)}
              leaveAction={leaveCommunityAction.bind(null, community.id, slug)}
              communityName={community.name}
            />
          )}
        </div>

        {community.description && (
          <p className="mt-4 whitespace-pre-wrap leading-7 text-[#4f5952]">
            {community.description}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-4 text-sm font-semibold">
          <Link
            href={`/communities/${slug}/members`}
            className="text-[#59654a] hover:underline"
          >
            Members
          </Link>
          {(isOwner || isModerator) && (
            <Link
              href={`/communities/${slug}/moderation`}
              className="text-[#59654a] hover:underline"
            >
              Moderation
            </Link>
          )}
          <ReportButton
            action={createReportAction.bind(null, "community", community.id, null)}
          />
        </div>

        {community.rules && (
          <details className="mt-5 rounded-2xl border border-[#e4ded2] bg-[#f7f4ee] p-4">
            <summary className="cursor-pointer text-sm font-semibold text-[#3e4a41]">
              Community rules
            </summary>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#5f6962]">
              {community.rules}
            </p>
          </details>
        )}
      </section>

      {isMember && (
        <section
          aria-label="Share with this community"
          className="mt-6 rounded-3xl border border-[#ded7c9] bg-white p-5 sm:p-6"
        >
          <CommunityPostComposer
            action={createCommunityPostAction.bind(null, community.id, slug)}
          />
        </section>
      )}

      <section aria-label="Community posts" className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">Posts</h2>
        <PostFeed
          initialPosts={posts.posts}
          initialCursor={posts.nextCursor}
          loadMore={loadMoreCommunityPosts.bind(null, community.id)}
          communityBadge={{ slug: community.slug, name: community.name }}
          emptyText={
            isMember
              ? "No posts yet. Be the first to share something."
              : "No posts yet."
          }
        />
      </section>
    </main>
  );
}
