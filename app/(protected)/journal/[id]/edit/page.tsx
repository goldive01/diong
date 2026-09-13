import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCompletedProfile } from "@/src/lib/auth";
import { getJournalEntry } from "@/src/lib/journal/journal-data";
import { listGoalOptions } from "@/src/lib/goals/goals-data";
import { listHabitOptions } from "@/src/lib/habits/habits-data";
import { listPrimeAssignmentOptions } from "@/src/lib/journal/journal-data";
import { JournalForm } from "@/src/components/journal/journal-form";
import { updateJournalEntryAction } from "@/app/(protected)/journal/[id]/actions";

export const metadata = {
  title: "Edit journal entry",
};

export default async function EditJournalEntryPage({
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

  const [goalOptions, habitOptions, primeOptions] = await Promise.all([
    listGoalOptions(supabase, userId),
    listHabitOptions(supabase, userId),
    listPrimeAssignmentOptions(supabase, userId),
  ]);

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-6 sm:py-14">
      <Link
        href={`/journal/${id}`}
        className="text-sm font-semibold text-[#59654a] hover:underline"
      >
        ← Back to entry
      </Link>

      <section className="mt-4 rounded-3xl border border-[#ded7c9] bg-white p-6 sm:p-9">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6f7b4f]">
          Journal
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Edit entry
        </h1>

        <JournalForm
          action={updateJournalEntryAction.bind(null, id)}
          initialValues={{
            title: entry.title ?? "",
            body: entry.body,
            mood: entry.mood ?? "",
            entryDate: entry.entry_date,
            goalId: entry.goal_id !== null ? String(entry.goal_id) : "",
            habitId: entry.habit_id !== null ? String(entry.habit_id) : "",
            primeAssignmentId:
              entry.prime_assignment_id !== null ? String(entry.prime_assignment_id) : "",
          }}
          goalOptions={goalOptions}
          habitOptions={habitOptions}
          primeOptions={primeOptions}
          submitLabel="Save changes"
          pendingLabel="Saving…"
          cancelHref={`/journal/${id}`}
        />
      </section>
    </main>
  );
}
