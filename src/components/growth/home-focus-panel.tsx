import Link from "next/link";
import type { GoalListItem } from "@/src/lib/goals/goals-data";
import type { HabitTodaySummary } from "@/src/lib/habits/habits-data";

// A single, calm "Your focus" panel for /home: up to 3 active goals and a
// plain habit check-in count. No fake statistics, no streak numbers here —
// just real counts, matching the restraint of HomeConnectionNudge. Never
// shows journal content.
export function HomeFocusPanel({
  activeGoals,
  habitSummary,
}: {
  activeGoals: GoalListItem[];
  habitSummary: HabitTodaySummary;
}) {
  const hasGoals = activeGoals.length > 0;
  const hasHabits = habitSummary.activeCount > 0;

  if (!hasGoals && !hasHabits) {
    return (
      <div className="rounded-3xl border border-[#ded7c9] bg-white p-6 sm:p-8">
        <h2 className="text-lg font-semibold">Your focus</h2>
        <p className="mt-2 leading-7 text-[#5f6962]">
          Define a goal or start a habit to see your focus here.
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold">
          <Link href="/goals" className="text-[#59654a] hover:underline">
            View goals
          </Link>
          <Link href="/habits" className="text-[#59654a] hover:underline">
            View habits
          </Link>
          <Link href="/journal/new" className="text-[#59654a] hover:underline">
            Write journal entry
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-[#ded7c9] bg-white p-6 sm:p-8">
      <h2 className="text-lg font-semibold">Your focus</h2>

      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        {hasGoals && (
          <div>
            <dt className="text-sm font-semibold text-[#3e4a41]">Goals</dt>
            <dd className="mt-1 text-sm text-[#5f6962]">
              {activeGoals.length} active goal{activeGoals.length === 1 ? "" : "s"}
            </dd>
            <ul className="mt-2 space-y-1">
              {activeGoals.map((goal) => (
                <li key={goal.id}>
                  <Link
                    href={`/goals/${goal.id}`}
                    className="text-sm font-semibold text-[#59654a] hover:underline"
                  >
                    {goal.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {hasHabits && (
          <div>
            <dt className="text-sm font-semibold text-[#3e4a41]">Habits</dt>
            <dd className="mt-1 text-sm text-[#5f6962]">
              {habitSummary.checkedInCount} of {habitSummary.activeCount} checked in today
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-4 flex flex-wrap gap-4 border-t border-[#ece7de] pt-4 text-sm font-semibold">
        <Link href="/goals" className="text-[#59654a] hover:underline">
          View goals
        </Link>
        <Link href="/habits" className="text-[#59654a] hover:underline">
          View habits
        </Link>
        <Link href="/journal/new" className="text-[#59654a] hover:underline">
          Write journal entry
        </Link>
      </div>
    </div>
  );
}
