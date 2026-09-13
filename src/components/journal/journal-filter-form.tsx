import Link from "next/link";
import { JOURNAL_MOOD_LABEL } from "@/src/lib/journal/journal-labels";
import { JOURNAL_MOODS } from "@/src/lib/journal/journal-vocab";

// A plain GET form — no client JS required, no server action. Search/filter
// state lives entirely in the URL, so results are shareable/bookmarkable and
// survive a refresh. Never sent anywhere but this request: journal filters
// have no public search integration.
export function JournalFilterForm({
  query,
  mood,
  entryDate,
}: {
  query: string;
  mood: string;
  entryDate: string;
}) {
  return (
    <form method="get" className="mb-6 flex flex-wrap items-end gap-3">
      <div className="min-w-0 flex-1">
        <label htmlFor="q" className="block text-sm font-semibold">
          Search
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Search your entries"
          className="mt-2 min-h-11 w-full rounded-xl border border-[#cfc8bb] px-4 font-normal outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
        />
      </div>
      <div>
        <label htmlFor="mood" className="block text-sm font-semibold">
          Mood
        </label>
        <select
          id="mood"
          name="mood"
          defaultValue={mood}
          className="mt-2 min-h-11 rounded-xl border border-[#cfc8bb] bg-white px-3 font-normal outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
        >
          <option value="">Any mood</option>
          {JOURNAL_MOODS.map((m) => (
            <option key={m} value={m}>
              {JOURNAL_MOOD_LABEL[m]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="date" className="block text-sm font-semibold">
          Date
        </label>
        <input
          id="date"
          name="date"
          type="date"
          defaultValue={entryDate}
          className="mt-2 min-h-11 rounded-xl border border-[#cfc8bb] px-3 font-normal outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
        />
      </div>
      <button
        type="submit"
        className="min-h-11 rounded-full bg-[#263b2d] px-5 text-sm font-semibold text-white transition hover:bg-[#1d3024]"
      >
        Filter
      </button>
      {(query || mood || entryDate) && (
        <Link
          href="/journal"
          className="min-h-11 rounded-full px-3 py-2.5 text-sm font-semibold text-[#4d574f] hover:underline"
        >
          Clear
        </Link>
      )}
    </form>
  );
}
