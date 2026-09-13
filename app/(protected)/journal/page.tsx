import Link from "next/link";
import { requireCompletedProfile } from "@/src/lib/auth";
import { listJournalEntries } from "@/src/lib/journal/journal-data";
import { parsePageNumber } from "@/src/lib/journal/journal-pagination";
import { isJournalMood } from "@/src/lib/journal/journal-vocab";
import { parseEntryDate } from "@/src/lib/journal/journal-validation";
import { JournalEntryCard } from "@/src/components/journal/journal-entry-card";
import { JournalFilterForm } from "@/src/components/journal/journal-filter-form";

export const metadata = {
  title: "Journal",
};

function firstValue(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string | string[];
    q?: string | string[];
    mood?: string | string[];
    date?: string | string[];
  }>;
}) {
  const { supabase, userId } = await requireCompletedProfile();
  const params = await searchParams;
  const page = parsePageNumber(params.page);
  const query = firstValue(params.q).trim();
  const moodParam = firstValue(params.mood).trim();
  const dateParam = firstValue(params.date).trim();
  const mood = isJournalMood(moodParam) ? moodParam : undefined;
  const entryDate = parseEntryDate(dateParam) ?? undefined;

  const result = await listJournalEntries(supabase, userId, page, {
    mood,
    entryDate,
    query,
  });

  function hrefFor(targetPage: number): string {
    const searchParams = new URLSearchParams();
    if (query) searchParams.set("q", query);
    if (mood) searchParams.set("mood", mood);
    if (entryDate) searchParams.set("date", entryDate);
    searchParams.set("page", String(targetPage));
    return `/journal?${searchParams.toString()}`;
  }

  const isFiltered = Boolean(query || mood || entryDate);

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-6 sm:py-14">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6f7b4f]">
            Journal
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Your journal
          </h1>
          <p className="mt-2 leading-7 text-[#5f6962]">
            Strictly private to you. Never shown in your feed, Discover,
            Search, profile, communities or messages.
          </p>
        </div>
        <Link
          href="/journal/new"
          className="min-h-11 shrink-0 rounded-full bg-[#263b2d] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1d3024]"
        >
          New entry
        </Link>
      </header>

      <JournalFilterForm query={query} mood={mood ?? ""} entryDate={entryDate ?? ""} />

      {result.entries.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#d8d1c4] px-4 py-10 text-center text-sm text-[#68716b]">
          {isFiltered
            ? "No entries match this filter."
            : "No journal entries yet. Write down what you are noticing."}
        </p>
      ) : (
        <div className="space-y-3">
          {result.entries.map((entry) => (
            <JournalEntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}

      {(result.hasPrevious || result.hasNext) && (
        <nav
          aria-label="Pagination"
          className="mt-6 flex items-center justify-between gap-4 text-sm font-semibold"
        >
          {result.hasPrevious ? (
            <Link href={hrefFor(result.page - 1)} className="text-[#59654a] hover:underline">
              ← Previous
            </Link>
          ) : (
            <span className="text-[#b3b0a6]">← Previous</span>
          )}
          <span className="font-normal text-[#7a8378]">Page {result.page}</span>
          {result.hasNext ? (
            <Link href={hrefFor(result.page + 1)} className="text-[#59654a] hover:underline">
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
