"use client";

import { useActionState } from "react";
import type { GoalMilestone } from "@/src/types/database";
import { INITIAL_GOAL_ACTION_STATE } from "@/src/lib/goals/goal-form-state";
import { toggleMilestoneAction } from "@/app/(protected)/goals/[id]/actions";

function MilestoneRow({
  goalId,
  milestone,
}: {
  goalId: number;
  milestone: GoalMilestone;
}) {
  const [state, formAction, pending] = useActionState(
    toggleMilestoneAction.bind(null, goalId, milestone.id),
    INITIAL_GOAL_ACTION_STATE,
  );

  return (
    <li className="flex items-start justify-between gap-3 px-4 py-3">
      <form action={formAction} className="flex min-w-0 flex-1 items-start gap-3">
        <button
          type="submit"
          disabled={pending}
          aria-pressed={milestone.is_completed}
          aria-label={
            milestone.is_completed
              ? `Mark "${milestone.title}" incomplete`
              : `Mark "${milestone.title}" complete`
          }
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs transition disabled:cursor-wait disabled:opacity-60 ${
            milestone.is_completed
              ? "border-[#6f7b4f] bg-[#6f7b4f] text-white"
              : "border-[#cfc8bb] text-transparent hover:border-[#6f7b4f]"
          }`}
        >
          ✓
        </button>
        <span
          className={`min-w-0 break-words text-sm ${
            milestone.is_completed ? "text-[#8b9384] line-through" : "text-[#1d2420]"
          }`}
        >
          {milestone.title}
        </span>
      </form>
      {state.status === "error" && state.message && (
        <p role="alert" className="shrink-0 text-xs text-[#9b3f37]">
          {state.message}
        </p>
      )}
    </li>
  );
}

export function GoalMilestoneList({
  goalId,
  milestones,
}: {
  goalId: number;
  milestones: GoalMilestone[];
}) {
  if (milestones.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-[#d8d1c4] px-4 py-6 text-center text-sm text-[#68716b]">
        No milestones yet. Break this goal into a few concrete steps.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-[#ece7de] rounded-2xl border border-[#e0dacd] bg-white">
      {milestones.map((milestone) => (
        <MilestoneRow key={milestone.id} goalId={goalId} milestone={milestone} />
      ))}
    </ul>
  );
}
