import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCompletedProfile } from "@/src/lib/auth";
import { getHabit } from "@/src/lib/habits/habits-data";
import { todayIsoDate } from "@/src/lib/habits/habit-validation";
import {
  habitFrequencyLabel,
  streakLabel,
  targetPerPeriodLabel,
} from "@/src/lib/habits/habit-labels";
import { HabitCheckinForm } from "@/src/components/habits/habit-checkin-form";
import { HabitActiveToggle } from "@/src/components/habits/habit-active-toggle";
import { HabitHistory } from "@/src/components/habits/habit-history";
import {
  archiveHabitAction,
  checkInHabitAction,
  reactivateHabitAction,
} from "@/app/(protected)/habits/[id]/actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return { title: `Habit ${id}` };
}

export default async function HabitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase, userId } = await requireCompletedProfile();
  const { id: idParam } = await params;
  const id = Number(idParam);

  if (!Number.isSafeInteger(id) || id <= 0) notFound();

  const today = todayIsoDate();
  const habit = await getHabit(supabase, userId, id, today);
  if (!habit) notFound();

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-6 sm:py-14">
      <Link
        href="/habits"
        className="text-sm font-semibold text-[#59654a] hover:underline"
      >
        ← Back to Habits
      </Link>

      <section className="mt-4 rounded-3xl border border-[#ded7c9] bg-white p-6 sm:p-9">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold tracking-tight">{habit.name}</h1>
            <p className="mt-1 text-sm text-[#657052]">
              {habitFrequencyLabel(habit.frequency)} ·{" "}
              {targetPerPeriodLabel(habit.frequency, habit.target_per_period)}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${
              habit.is_active
                ? "bg-[#eef2e5] text-[#42512a]"
                : "border border-[#cfc8bb] text-[#8b9384]"
            }`}
          >
            {habit.is_active ? "Active" : "Archived"}
          </span>
        </div>

        {habit.description && (
          <p className="mt-4 whitespace-pre-wrap leading-7 text-[#4f5952]">
            {habit.description}
          </p>
        )}

        <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-sm text-[#5f6962]">
          <div>
            <dt className="font-semibold text-[#3e4a41]">Current streak</dt>
            <dd>{streakLabel(habit.streak.currentStreak, habit.frequency)}</dd>
          </div>
          <div>
            <dt className="font-semibold text-[#3e4a41]">Longest streak</dt>
            <dd>{streakLabel(habit.streak.longestStreak, habit.frequency)}</dd>
          </div>
          <div>
            <dt className="font-semibold text-[#3e4a41]">Total check-ins</dt>
            <dd>{habit.streak.totalCheckins}</dd>
          </div>
        </dl>

        {habit.is_active && (
          <div className="mt-6 border-t border-[#ece7de] pt-6">
            <HabitCheckinForm
              action={checkInHabitAction.bind(null, habit.id)}
              targetPerPeriod={habit.target_per_period}
            />
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[#ece7de] pt-6">
          <HabitActiveToggle
            isActive={habit.is_active}
            archiveAction={archiveHabitAction.bind(null, habit.id)}
            reactivateAction={reactivateHabitAction.bind(null, habit.id)}
          />
          <Link
            href={`/habits/${habit.id}/edit`}
            className="text-sm font-semibold text-[#59654a] hover:underline"
          >
            Edit habit
          </Link>
        </div>
      </section>

      <section aria-labelledby="habit-history-heading" className="mt-8">
        <h2 id="habit-history-heading" className="mb-4 text-lg font-semibold">
          Recent history
        </h2>
        <HabitHistory checkins={habit.recentCheckins} />
      </section>
    </main>
  );
}
