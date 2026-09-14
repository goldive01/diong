import Link from "next/link";
import { requireCompletedProfile } from "@/src/lib/auth";
import { listGoals } from "@/src/lib/goals/goals-data";
import { goalSection } from "@/src/lib/goals/goal-labels";
import { GoalCard } from "@/src/components/goals/goal-card";

export const metadata = {
  title: "Goals",
};

export default async function GoalsPage() {
  const { supabase, userId } = await requireCompletedProfile();
  const goals = await listGoals(supabase, userId);

  const active = goals.filter((g) => goalSection(g.status) === "active");
  const completed = goals.filter((g) => goalSection(g.status) === "completed");
  const pausedOrArchived = goals.filter(
    (g) => goalSection(g.status) === "paused_or_archived",
  );

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-6 sm:py-14">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6f7b4f]">
            Goals
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Your goals
          </h1>
          <p className="mt-2 leading-7 text-[#5f6962]">
            Private to you. Define a direction, break it into milestones, and
            track progress at your own pace.
          </p>
        </div>
        <Link
          href="/goals/new"
          className="min-h-11 shrink-0 rounded-full bg-[#263b2d] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1d3024]"
        >
          New goal
        </Link>
      </header>

      {goals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#d8d1c4] px-4 py-10 text-center text-sm text-[#68716b]">
          <p>No goals yet. Create a direction you want to work toward.</p>
          <Link href="/goals/new" className="mt-3 inline-block font-semibold text-[#59654a] hover:underline">
            Create your first goal
          </Link>
        </div>
      ) : (
        <div className="space-y-10">
          <section aria-labelledby="active-goals-heading">
            <h2 id="active-goals-heading" className="mb-4 text-lg font-semibold">
              Active
            </h2>
            {active.length === 0 ? (
              <p className="text-sm text-[#68716b]">No active goals.</p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {active.map((goal) => (
                  <li key={goal.id}>
                    <GoalCard goal={goal} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="completed-goals-heading">
            <h2 id="completed-goals-heading" className="mb-4 text-lg font-semibold">
              Completed
            </h2>
            {completed.length === 0 ? (
              <p className="text-sm text-[#68716b]">No completed goals yet.</p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {completed.map((goal) => (
                  <li key={goal.id}>
                    <GoalCard goal={goal} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="paused-goals-heading">
            <h2 id="paused-goals-heading" className="mb-4 text-lg font-semibold">
              Paused / Archived
            </h2>
            {pausedOrArchived.length === 0 ? (
              <p className="text-sm text-[#68716b]">Nothing paused or archived.</p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {pausedOrArchived.map((goal) => (
                  <li key={goal.id}>
                    <GoalCard goal={goal} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
