import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCompletedProfile } from "@/src/lib/auth";
import { getGoal } from "@/src/lib/goals/goals-data";
import {
  formatTargetDate,
  goalStatusLabel,
  milestoneSummaryLabel,
} from "@/src/lib/goals/goal-labels";
import { GoalProgressBar } from "@/src/components/goals/goal-progress-bar";
import { GoalProgressForm } from "@/src/components/goals/goal-progress-form";
import { GoalStatusActions } from "@/src/components/goals/goal-status-actions";
import { GoalMilestoneList } from "@/src/components/goals/goal-milestone-list";
import { AddMilestoneForm } from "@/src/components/goals/add-milestone-form";
import { GoalActionButton } from "@/src/components/goals/goal-action-button";
import {
  addMilestoneAction,
  setGoalProgressAction,
  setGoalProgressFromMilestonesAction,
} from "@/app/(protected)/goals/[id]/actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return { title: `Goal ${id}` };
}

export default async function GoalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase, userId } = await requireCompletedProfile();
  const { id: idParam } = await params;
  const id = Number(idParam);

  if (!Number.isSafeInteger(id) || id <= 0) notFound();

  const goal = await getGoal(supabase, userId, id);
  if (!goal) notFound();

  const targetDate = formatTargetDate(goal.target_date);
  const completedCount = goal.milestones.filter((m) => m.is_completed).length;
  const isCompleted = goal.status === "completed";

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-6 sm:py-14">
      <Link
        href="/goals"
        className="text-sm font-semibold text-[#59654a] hover:underline"
      >
        ← Back to Goals
      </Link>

      <section className="mt-4 rounded-3xl border border-[#ded7c9] bg-white p-6 sm:p-9">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold tracking-tight">{goal.title}</h1>
            {goal.category && (
              <p className="mt-1 text-sm text-[#657052]">{goal.category}</p>
            )}
          </div>
          <span className="shrink-0 rounded-full border border-[#cfc8bb] px-3 py-1.5 text-sm font-semibold text-[#4d574f]">
            {goalStatusLabel(goal.status)}
          </span>
        </div>

        {goal.description && (
          <p className="mt-4 whitespace-pre-wrap leading-7 text-[#4f5952]">
            {goal.description}
          </p>
        )}

        <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-sm text-[#5f6962]">
          {targetDate && (
            <div>
              <dt className="font-semibold text-[#3e4a41]">Target date</dt>
              <dd>{targetDate}</dd>
            </div>
          )}
          <div>
            <dt className="font-semibold text-[#3e4a41]">Created</dt>
            <dd>{formatTargetDate(goal.created_at.slice(0, 10))}</dd>
          </div>
          <div>
            <dt className="font-semibold text-[#3e4a41]">Milestones</dt>
            <dd>{milestoneSummaryLabel(goal.milestones.length, completedCount)}</dd>
          </div>
        </dl>

        <div className="mt-6">
          <GoalProgressBar percent={goal.progress_percent} />
        </div>

        <div className="mt-5">
          <GoalProgressForm
            action={setGoalProgressAction.bind(null, goal.id)}
            initialPercent={goal.progress_percent}
            disabled={isCompleted}
          />
          {goal.milestones.length > 0 && !isCompleted && (
            <div className="mt-2">
              <GoalActionButton
                action={setGoalProgressFromMilestonesAction.bind(null, goal.id)}
                label="Set progress from completed milestones"
                pendingLabel="Calculating…"
                variant="quiet"
              />
            </div>
          )}
        </div>

        <div className="mt-6 border-t border-[#ece7de] pt-6">
          <GoalStatusActions goalId={goal.id} status={goal.status} />
        </div>

        <div className="mt-6">
          <Link
            href={`/goals/${goal.id}/edit`}
            className="text-sm font-semibold text-[#59654a] hover:underline"
          >
            Edit goal details
          </Link>
        </div>
      </section>

      <section aria-labelledby="milestones-heading" className="mt-8">
        <h2 id="milestones-heading" className="mb-4 text-lg font-semibold">
          Milestones
        </h2>
        <div className="mb-4">
          <AddMilestoneForm action={addMilestoneAction.bind(null, goal.id)} />
        </div>
        <GoalMilestoneList goalId={goal.id} milestones={goal.milestones} />
      </section>

      {goal.journalEntries.length > 0 && (
        <section aria-labelledby="linked-journal-heading" className="mt-8">
          <h2 id="linked-journal-heading" className="mb-4 text-lg font-semibold">
            Journal entries about this goal
          </h2>
          <ul className="divide-y divide-[#ece7de] rounded-2xl border border-[#e0dacd] bg-white">
            {goal.journalEntries.map((entry) => (
              <li key={entry.id}>
                <Link
                  href={`/journal/${entry.id}`}
                  className="block px-4 py-3 hover:bg-[#f7f4ee]"
                >
                  <p className="text-sm font-semibold text-[#1d2420]">
                    {entry.title ?? formatTargetDate(entry.entry_date)}
                  </p>
                  <p className="text-xs text-[#657052]">
                    {formatTargetDate(entry.entry_date)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
