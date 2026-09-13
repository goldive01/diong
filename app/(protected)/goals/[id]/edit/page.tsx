import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCompletedProfile } from "@/src/lib/auth";
import { getGoal } from "@/src/lib/goals/goals-data";
import { GoalForm } from "@/src/components/goals/goal-form";
import { updateGoalAction } from "@/app/(protected)/goals/[id]/actions";

export const metadata = {
  title: "Edit goal",
};

export default async function EditGoalPage({
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

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-6 sm:py-14">
      <Link
        href={`/goals/${id}`}
        className="text-sm font-semibold text-[#59654a] hover:underline"
      >
        ← Back to {goal.title}
      </Link>

      <section className="mt-4 rounded-3xl border border-[#ded7c9] bg-white p-6 sm:p-9">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6f7b4f]">
          Goals
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Edit goal
        </h1>

        <GoalForm
          action={updateGoalAction.bind(null, id)}
          initialValues={{
            title: goal.title,
            description: goal.description,
            category: goal.category ?? "",
            targetDate: goal.target_date ?? "",
          }}
          submitLabel="Save changes"
          pendingLabel="Saving…"
          cancelHref={`/goals/${id}`}
        />
      </section>
    </main>
  );
}
