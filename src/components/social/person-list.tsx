import Link from "next/link";
import type { FollowListPage } from "@/src/lib/social/social-data";
import { PersonCard } from "@/src/components/social/person-card";

// One page of a follower / following list, with calm page navigation. The
// caller passes the base path (e.g. "/profile/imoh/followers") so the links
// only ever add "?page=N".
export function PersonList({
  page,
  basePath,
  emptyText,
}: {
  page: FollowListPage;
  basePath: string;
  emptyText: string;
}) {
  if (page.people.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-[#d8d1c4] px-4 py-8 text-center text-sm text-[#68716b]">
        {emptyText}
      </p>
    );
  }

  return (
    <div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {page.people.map((person) => (
          <li key={person.id}>
            <PersonCard person={person} />
          </li>
        ))}
      </ul>
      <ListPagination page={page} basePath={basePath} />
    </div>
  );
}

function ListPagination({
  page,
  basePath,
}: {
  page: FollowListPage;
  basePath: string;
}) {
  if (!page.hasPrevious && !page.hasNext) return null;

  return (
    <nav
      aria-label="Pagination"
      className="mt-6 flex items-center justify-between gap-4 text-sm font-semibold"
    >
      {page.hasPrevious ? (
        <Link
          href={`${basePath}?page=${page.page - 1}`}
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
          href={`${basePath}?page=${page.page + 1}`}
          className="text-[#59654a] hover:underline"
        >
          Next →
        </Link>
      ) : (
        <span className="text-[#b3b0a6]">Next →</span>
      )}
    </nav>
  );
}
