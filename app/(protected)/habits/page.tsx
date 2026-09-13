import Link from "next/link";
import { requireCompletedProfile } from "@/src/lib/auth";
import { listHabits } from "@/src/lib/habits/habits-data";
import { todayIsoDate } from "@/src/lib/habits/habit-validation";
import { HabitCard } from "@/src/components/habits/habit-card";

export const metadata = {
  title: "Habits",
};

export default async function HabitsPage() {
  const { supabase, userId } = await requireCompletedProfile();
  const today = todayIsoDate();
  const habits = await listHabits(supabase, userId, today);

  const active = habits.filter((h) => h.is_active);
  const archived = habits.filter((h) => !h.is_active);
  const notCheckedIn = active.filter((h) => !h.checkedInToday);

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-6 sm:py-14">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6f7b4f]">
            Habits
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Your habits
          </h1>
          <p className="mt-2 leading-7 text-[#5f6962]">
            Private to you. Check in, and watch a simple, honest streak build.
          </p>
        </div>
        <Link
          href="/habits/new"
          className="min-h-11 shrink-0 rounded-full bg-[#263b2d] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1d3024]"
        >
          New habit
        </Link>
      </header>

      {habits.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#d8d1c4] px-4 py-10 text-center text-sm text-[#68716b]">
          No habits yet. Start with one repeatable action.
        </p>
      ) : (
        <div className="space-y-10">
          <section aria-labelledby="today-habits-heading">
            <h2 id="today-habits-heading" className="mb-4 text-lg font-semibold">
              Today
            </h2>
            {active.length === 0 ? (
              <p className="text-sm text-[#68716b]">No active habits.</p>
            ) : (
              <>
                <p className="mb-3 text-sm text-[#5f6962]">
                  {active.length - notCheckedIn.length} of {active.length} checked in today
                </p>
                <ul className="space-y-3">
                  {active.map((habit) => (
                    <li key={habit.id}>
                      <HabitCard habit={habit} />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          {archived.length > 0 && (
            <section aria-labelledby="archived-habits-heading">
              <h2
                id="archived-habits-heading"
                className="mb-4 text-lg font-semibold"
              >
                Archived
              </h2>
              <ul className="space-y-3">
                {archived.map((habit) => (
                  <li key={habit.id}>
                    <HabitCard habit={habit} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
