import Link from "next/link";
import { requireCompletedProfile } from "@/src/lib/auth";
import { GoalForm } from "@/src/components/goals/goal-form";
import { createGoalAction } from "@/app/(protected)/goals/new/actions";

export const metadata = {
  title: "New goal",
};

export default async function NewGoalPage() {
  await requireCompletedProfile();

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-6 sm:py-14">
      <Link
        href="/goals"
        className="text-sm font-semibold text-[#59654a] hover:underline"
      >
        ← Back to Goals
      </Link>

      <section className="mt-4 rounded-3xl border border-[#ded7c9] bg-white p-6 sm:p-9">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6f7b4f]">
          Goals
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Define a goal
        </h1>
        <p className="mt-2 leading-7 text-[#5f6962]">
          Private to you. You can break it into milestones and update its
          progress afterwards.
        </p>

        <GoalForm action={createGoalAction} />
      </section>
    </main>
  );
}
