import Link from "next/link";
import { requireCompletedProfile } from "@/src/lib/auth";
import { discoverPeople, listDiscoverPosts } from "@/src/lib/social/discover-data";
import { parsePageNumber, PAGE_SIZE } from "@/src/lib/social/pagination";
import { listDiscoverCommunities } from "@/src/lib/communities/community-data";
import { DiscoverPeopleList } from "@/src/components/social/discover-people-list";
import { PostFeed } from "@/src/components/social/post-feed";
import { CommunityCard } from "@/src/components/communities/community-card";
import { loadMoreDiscoverPosts } from "@/app/(protected)/discover/actions";

const DISCOVER_COMMUNITIES_LIMIT = 4;

export const metadata = {
  title: "Discover",
};

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ peoplePage?: string | string[] }>;
}) {
  const { supabase } = await requireCompletedProfile();
  const { peoplePage: peoplePageParam } = await searchParams;
  const peoplePage = parsePageNumber(peoplePageParam);

  const [people, posts, communities] = await Promise.all([
    discoverPeople(supabase, peoplePage),
    listDiscoverPosts(supabase, { limit: PAGE_SIZE }),
    listDiscoverCommunities(supabase, 1, DISCOVER_COMMUNITIES_LIMIT),
  ]);

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-6 sm:py-14">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6f7b4f]">
          Discover
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Find people and progress worth following
        </h1>
        <p className="mt-2 leading-7 text-[#5f6962]">
          Members you are not yet following, and recent public posts from
          across Diong.
        </p>
      </header>

      <section aria-labelledby="discover-people-heading" className="mb-10">
        <h2 id="discover-people-heading" className="mb-4 text-lg font-semibold">
          People to discover
        </h2>
        <DiscoverPeopleList
          page={people}
          basePath="/discover"
          pageParam="peoplePage"
          emptyText="No new people to discover right now. Check back soon."
        />
      </section>

      {communities.communities.length > 0 && (
        <section aria-labelledby="discover-communities-heading" className="mb-10">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2
              id="discover-communities-heading"
              className="text-lg font-semibold"
            >
              Communities to discover
            </h2>
            <Link
              href="/communities"
              className="text-sm font-semibold text-[#59654a] hover:underline"
            >
              See all
            </Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {communities.communities.map((community) => (
              <li key={community.id}>
                <CommunityCard community={community} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="discover-posts-heading">
        <h2 id="discover-posts-heading" className="mb-4 text-lg font-semibold">
          Recent public posts
        </h2>
        <PostFeed
          initialPosts={posts.posts}
          initialCursor={posts.nextCursor}
          loadMore={loadMoreDiscoverPosts}
          emptyText="No public posts yet."
        />
      </section>
    </main>
  );
}
