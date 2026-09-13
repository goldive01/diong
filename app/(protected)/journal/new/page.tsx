import Link from "next/link";
import { requireCompletedProfile } from "@/src/lib/auth";
import { listGoalOptions } from "@/src/lib/goals/goals-data";
import { listHabitOptions } from "@/src/lib/habits/habits-data";
import { listPrimeAssignmentOptions } from "@/src/lib/journal/journal-data";
import { emptyJournalForm } from "@/src/lib/journal/journal-form-state";
import { todayIsoDate } from "@/src/lib/journal/journal-validation";
import { JournalForm } from "@/src/components/journal/journal-form";
import { createJournalEntryAction } from "@/app/(protected)/journal/new/actions";

export const metadata = {
  title: "New journal entry",
};

function firstValue(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function NewJournalEntryPage({
  searchParams,
}: {
  searchParams: Promise<{
    goalId?: string | string[];
    primeAssignmentId?: string | string[];
  }>;
}) {
  const { supabase, userId } = await requireCompletedProfile();
  const params = await searchParams;

  const [goalOptions, habitOptions, primeOptions] = await Promise.all([
    listGoalOptions(supabase, userId),
    listHabitOptions(supabase, userId),
    listPrimeAssignmentOptions(supabase, userId),
  ]);

  const initialValues = {
    ...emptyJournalForm(todayIsoDate()),
    goalId: firstValue(params.goalId),
    primeAssignmentId: firstValue(params.primeAssignmentId),
  };

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-6 sm:py-14">
      <Link
        href="/journal"
        className="text-sm font-semibold text-[#59654a] hover:underline"
      >
        ← Back to Journal
      </Link>

      <section className="mt-4 rounded-3xl border border-[#ded7c9] bg-white p-6 sm:p-9">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6f7b4f]">
          Journal
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Write an entry
        </h1>
        <p className="mt-2 leading-7 text-[#5f6962]">
          Strictly private to you. You can optionally connect this entry to a
          goal, habit or Daily Prime.
        </p>

        <JournalForm
          action={createJournalEntryAction}
          initialValues={initialValues}
          goalOptions={goalOptions}
          habitOptions={habitOptions}
          primeOptions={primeOptions}
        />
      </section>
    </main>
  );
}
