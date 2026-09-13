import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCompletedProfile } from "@/src/lib/auth";
import { getJournalEntry } from "@/src/lib/journal/journal-data";
import { formatEntryDate, journalMoodLabel } from "@/src/lib/journal/journal-labels";
import { JournalDeleteButton } from "@/src/components/journal/journal-delete-button";
import { deleteJournalEntryAction } from "@/app/(protected)/journal/[id]/actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return { title: `Journal entry ${id}` };
}

export default async function JournalEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase, userId } = await requireCompletedProfile();
  const { id: idParam } = await params;
  const id = Number(idParam);

  if (!Number.isSafeInteger(id) || id <= 0) notFound();

  const entry = await getJournalEntry(supabase, userId, id);
  if (!entry) notFound();

  const moodLabel = journalMoodLabel(entry.mood);

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-6 sm:py-14">
      <Link
        href="/journal"
        className="text-sm font-semibold text-[#59654a] hover:underline"
      >
        ← Back to Journal
      </Link>

      <section className="mt-4 rounded-3xl border border-[#ded7c9] bg-white p-6 sm:p-9">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#8b9384]">
          {formatEntryDate(entry.entry_date)}
        </p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">
            {entry.title ?? "Untitled entry"}
          </h1>
          {moodLabel && (
            <span className="shrink-0 rounded-full bg-[#eef2e5] px-3 py-1.5 text-sm font-semibold text-[#42512a]">
              {moodLabel}
            </span>
          )}
        </div>

        <p className="mt-5 whitespace-pre-wrap leading-7 text-[#38423b]">{entry.body}</p>

        {(entry.goal || entry.habit || entry.primeTitle) && (
          <div className="mt-6 flex flex-wrap gap-2 border-t border-[#ece7de] pt-5 text-sm font-semibold">
            {entry.goal && (
              <Link
                href={`/goals/${entry.goal.id}`}
                className="rounded-full border border-[#cfc8bb] px-3 py-1.5 text-[#59654a] hover:underline"
              >
                Goal: {entry.goal.title}
              </Link>
            )}
            {entry.habit && (
              <Link
                href={`/habits/${entry.habit.id}`}
                className="rounded-full border border-[#cfc8bb] px-3 py-1.5 text-[#59654a] hover:underline"
              >
                Habit: {entry.habit.name}
              </Link>
            )}
            {entry.primeTitle && (
              <span className="rounded-full border border-[#cfc8bb] px-3 py-1.5 text-[#4d574f]">
                Prime: {entry.primeTitle}
              </span>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[#ece7de] pt-6">
          <Link
            href={`/journal/${entry.id}/edit`}
            className="min-h-10 rounded-full border border-[#cfc8bb] px-4 py-2 text-sm font-semibold text-[#3e4a41] transition hover:bg-[#f7f4ee]"
          >
            Edit entry
          </Link>
          <JournalDeleteButton action={deleteJournalEntryAction.bind(null, entry.id)} />
        </div>
      </section>
    </main>
  );
}
