import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCompletedProfile } from "@/src/lib/auth";
import { getHabit } from "@/src/lib/habits/habits-data";
import { todayIsoDate } from "@/src/lib/habits/habit-validation";
import { HabitForm } from "@/src/components/habits/habit-form";
import { updateHabitAction } from "@/app/(protected)/habits/[id]/actions";

export const metadata = {
  title: "Edit habit",
};

export default async function EditHabitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase, userId } = await requireCompletedProfile();
  const { id: idParam } = await params;
  const id = Number(idParam);

  if (!Number.isSafeInteger(id) || id <= 0) notFound();

  const habit = await getHabit(supabase, userId, id, todayIsoDate());
  if (!habit) notFound();

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-6 sm:py-14">
      <Link
        href={`/habits/${id}`}
        className="text-sm font-semibold text-[#59654a] hover:underline"
      >
        ← Back to {habit.name}
      </Link>

      <section className="mt-4 rounded-3xl border border-[#ded7c9] bg-white p-6 sm:p-9">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6f7b4f]">
          Habits
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Edit habit
        </h1>

        <HabitForm
          action={updateHabitAction.bind(null, id)}
          initialValues={{
            name: habit.name,
            description: habit.description,
            frequency: habit.frequency,
            targetPerPeriod: String(habit.target_per_period),
          }}
          submitLabel="Save changes"
          pendingLabel="Saving…"
          cancelHref={`/habits/${id}`}
        />
      </section>
    </main>
  );
}
