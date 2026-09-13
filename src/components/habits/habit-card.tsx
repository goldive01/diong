import Link from "next/link";
import type { HabitListItem } from "@/src/lib/habits/habits-data";
import { habitFrequencyLabel, streakLabel } from "@/src/lib/habits/habit-labels";
import { HabitCheckinButton } from "@/src/components/habits/habit-checkin-button";
import {
  checkInHabitAction,
  undoHabitCheckinAction,
} from "@/app/(protected)/habits/[id]/actions";

export function HabitCard({ habit }: { habit: HabitListItem }) {
  return (
    <div className="rounded-2xl border border-[#e0dacd] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Link
          href={`/habits/${habit.id}`}
          className="min-w-0 font-semibold text-[#1d2420] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f7b4f]/40"
        >
          <span className="block truncate">{habit.name}</span>
          <span className="block text-sm font-normal text-[#657052]">
            {habitFrequencyLabel(habit.frequency)} · Streak:{" "}
            {streakLabel(habit.streak.currentStreak, habit.frequency)}
          </span>
        </Link>
        {habit.is_active ? (
          <HabitCheckinButton
            checkedInToday={habit.checkedInToday}
            checkInAction={checkInHabitAction.bind(null, habit.id)}
            undoAction={undoHabitCheckinAction.bind(null, habit.id, undefined)}
            habitName={habit.name}
          />
        ) : (
          <span className="shrink-0 rounded-full border border-[#cfc8bb] px-3 py-1.5 text-xs font-semibold text-[#8b9384]">
            Archived
          </span>
        )}
      </div>
    </div>
  );
}
