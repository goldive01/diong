import Link from "next/link";
import { requireCompletedProfile } from "@/src/lib/auth";
import {
  listDiscoverCommunities,
  listMyCommunities,
} from "@/src/lib/communities/community-data";
import { parsePageNumber } from "@/src/lib/communities/community-pagination";
import { CommunityList } from "@/src/components/communities/community-list";

export const metadata = {
  title: "Communities",
};

export default async function CommunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{
    joinedPage?: string | string[];
    discoverPage?: string | string[];
  }>;
}) {
  const { supabase } = await requireCompletedProfile();
  const { joinedPage: joinedPageParam, discoverPage: discoverPageParam } =
    await searchParams;
  const joinedPage = parsePageNumber(joinedPageParam);
  const discoverPage = parsePageNumber(discoverPageParam);

  const [joined, discover] = await Promise.all([
    listMyCommunities(supabase, joinedPage),
    listDiscoverCommunities(supabase, discoverPage),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-6 sm:py-14">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6f7b4f]">
            Communities
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Grow together
          </h1>
          <p className="mt-2 leading-7 text-[#5f6962]">
            Public spaces built around a shared goal. Join one, or start your
            own.
          </p>
        </div>
        <Link
          href="/communities/new"
          className="min-h-11 shrink-0 rounded-full bg-[#263b2d] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1d3024]"
        >
          Start a community
        </Link>
      </header>

      <section aria-labelledby="my-communities-heading" className="mb-10">
        <h2 id="my-communities-heading" className="mb-4 text-lg font-semibold">
          Communities you joined
        </h2>
        <CommunityList
          page={joined}
          basePath="/communities"
          pageParam="joinedPage"
          extraParams={{ discoverPage: String(discoverPage) }}
          emptyText="You have not joined a community yet."
        />
      </section>

      <section aria-labelledby="discover-communities-heading">
        <h2
          id="discover-communities-heading"
          className="mb-4 text-lg font-semibold"
        >
          Discover communities
        </h2>
        <CommunityList
          page={discover}
          basePath="/communities"
          pageParam="discoverPage"
          extraParams={{ joinedPage: String(joinedPage) }}
          emptyText="No new communities to discover right now."
        />
      </section>
    </main>
  );
}
