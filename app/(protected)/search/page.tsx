import { requireCompletedProfile } from "@/src/lib/auth";
import { searchPeople, searchPosts } from "@/src/lib/social/search-data";
import { parsePageNumber, PAGE_SIZE } from "@/src/lib/social/pagination";
import { parseSearchQuery } from "@/src/lib/social/search-validation";
import { searchCommunities } from "@/src/lib/communities/community-data";
import { SearchForm } from "@/src/components/social/search-form";
import { DiscoverPeopleList } from "@/src/components/social/discover-people-list";
import { PostFeed } from "@/src/components/social/post-feed";
import { CommunityList } from "@/src/components/communities/community-list";
import { loadMoreSearchPosts } from "@/app/(protected)/search/actions";

export const metadata = {
  title: "Search",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    peoplePage?: string | string[];
    communitiesPage?: string | string[];
  }>;
}) {
  const { supabase } = await requireCompletedProfile();
  const {
    q,
    peoplePage: peoplePageParam,
    communitiesPage: communitiesPageParam,
  } = await searchParams;
  const { query, valid } = parseSearchQuery(q);
  const peoplePage = parsePageNumber(peoplePageParam);
  const communitiesPage = parsePageNumber(communitiesPageParam);

  const results =
    query.length > 0 && valid
      ? await Promise.all([
          searchPeople(supabase, query, peoplePage),
          searchPosts(supabase, query, { limit: PAGE_SIZE }),
          searchCommunities(supabase, query, communitiesPage),
        ])
      : null;

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-6 sm:py-14">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6f7b4f]">
          Search
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Find people and posts
        </h1>
      </header>

      <SearchForm defaultValue={query} />

      {query.length > 0 && !valid && (
        <p role="status" className="mt-4 text-sm text-[#5f6962]">
          Type at least 2 characters to search.
        </p>
      )}

      {results && (
        <div className="mt-8 space-y-10">
          <section aria-labelledby="search-people-heading">
            <h2 id="search-people-heading" className="mb-4 text-lg font-semibold">
              People
            </h2>
            <DiscoverPeopleList
              page={results[0]}
              basePath="/search"
              pageParam="peoplePage"
              extraParams={{ q: query }}
              emptyText="No people found."
            />
          </section>

          <section aria-labelledby="search-posts-heading">
            <h2 id="search-posts-heading" className="mb-4 text-lg font-semibold">
              Posts
            </h2>
            <PostFeed
              initialPosts={results[1].posts}
              initialCursor={results[1].nextCursor}
              loadMore={loadMoreSearchPosts.bind(null, query)}
              emptyText="No posts found."
            />
          </section>

          <section aria-labelledby="search-communities-heading">
            <h2
              id="search-communities-heading"
              className="mb-4 text-lg font-semibold"
            >
              Communities
            </h2>
            <CommunityList
              page={results[2]}
              basePath="/search"
              pageParam="communitiesPage"
              extraParams={{ q: query }}
              emptyText="No communities found."
            />
          </section>
        </div>
      )}
    </main>
  );
}
