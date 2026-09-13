import Link from "next/link";
import type { JournalListItem } from "@/src/lib/journal/journal-data";
import { formatEntryDate, journalMoodLabel } from "@/src/lib/journal/journal-labels";

// One row on /journal. Never renders the full body — only the bounded
// preview journalPreview() already produced. Private to the owner; this
// component is never rendered anywhere another user could see it.
export function JournalEntryCard({ entry }: { entry: JournalListItem }) {
  const moodLabel = journalMoodLabel(entry.mood);

  return (
    <Link
      href={`/journal/${entry.id}`}
      className="block rounded-2xl border border-[#e0dacd] bg-white p-4 transition hover:border-[#c7bfab] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f7b4f]/40"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#8b9384]">
            {formatEntryDate(entry.entryDate)}
          </p>
          <p className="mt-1 truncate font-semibold text-[#1d2420]">
            {entry.title ?? "Untitled entry"}
          </p>
        </div>
        {moodLabel && (
          <span className="shrink-0 rounded-full bg-[#eef2e5] px-2.5 py-1 text-xs font-semibold text-[#42512a]">
            {moodLabel}
          </span>
        )}
      </div>

      <p className="mt-2 text-sm leading-6 text-[#5f6962]">{entry.bodyPreview}</p>

      {(entry.goal || entry.habit || entry.primeTitle) && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-[#59654a]">
          {entry.goal && (
            <span className="rounded-full border border-[#cfc8bb] px-2.5 py-1">
              Goal: {entry.goal.title}
            </span>
          )}
          {entry.habit && (
            <span className="rounded-full border border-[#cfc8bb] px-2.5 py-1">
              Habit: {entry.habit.name}
            </span>
          )}
          {entry.primeTitle && (
            <span className="rounded-full border border-[#cfc8bb] px-2.5 py-1">
              Prime: {entry.primeTitle}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
