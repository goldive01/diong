import Link from "next/link";
import type { GoalListItem } from "@/src/lib/goals/goals-data";
import { formatTargetDate, goalStatusLabel } from "@/src/lib/goals/goal-labels";
import { GoalProgressBar } from "@/src/components/goals/goal-progress-bar";

export function GoalCard({ goal }: { goal: GoalListItem }) {
  const targetDate = formatTargetDate(goal.target_date);

  return (
    <Link
      href={`/goals/${goal.id}`}
      className="block rounded-2xl border border-[#e0dacd] bg-white p-4 transition hover:border-[#c7bfab] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f7b4f]/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-[#1d2420]">{goal.title}</p>
          {goal.category && (
            <p className="text-sm text-[#657052]">{goal.category}</p>
          )}
        </div>
        <span className="shrink-0 rounded-full border border-[#cfc8bb] px-2.5 py-1 text-xs font-semibold text-[#4d574f]">
          {goalStatusLabel(goal.status)}
        </span>
      </div>

      <div className="mt-3">
        <GoalProgressBar percent={goal.progress_percent} />
      </div>

      {targetDate && (
        <p className="mt-2 text-xs text-[#69726c]">Target: {targetDate}</p>
      )}
    </Link>
  );
}
