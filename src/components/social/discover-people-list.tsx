import Link from "next/link";
import type { DiscoverPerson } from "@/src/lib/social/discover-data";
import type { SearchPerson } from "@/src/lib/social/search-data";
import { DiscoverPersonCard } from "@/src/components/social/discover-person-card";

export type PeoplePage = {
  people: ((DiscoverPerson | SearchPerson) & { sharedInterestCount?: number })[];
  page: number;
  hasPrevious: boolean;
  hasNext: boolean;
};

// A page-based list of people (Discover or Search), each rendered with
// DiscoverPersonCard. `pageParam` lets Discover and Search each own their own
// query-param name so the two sections on /search can page independently.
export function DiscoverPeopleList({
  page,
  basePath,
  pageParam,
  extraParams,
  emptyText,
}: {
  page: PeoplePage;
  basePath: string;
  pageParam: string;
  extraParams?: Record<string, string>;
  emptyText: string;
}) {
  if (page.people.length === 0) {
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
        {page.people.map((person) => (
          <li key={person.id}>
            <DiscoverPersonCard person={person} />
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
