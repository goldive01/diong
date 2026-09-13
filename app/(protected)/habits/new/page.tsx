import Link from "next/link";
import { requireCompletedProfile } from "@/src/lib/auth";
import { HabitForm } from "@/src/components/habits/habit-form";
import { createHabitAction } from "@/app/(protected)/habits/new/actions";

export const metadata = {
  title: "New habit",
};

export default async function NewHabitPage() {
  await requireCompletedProfile();

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-6 sm:py-14">
      <Link
        href="/habits"
        className="text-sm font-semibold text-[#59654a] hover:underline"
      >
        ← Back to Habits
      </Link>

      <section className="mt-4 rounded-3xl border border-[#ded7c9] bg-white p-6 sm:p-9">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6f7b4f]">
          Habits
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Start a habit
        </h1>
        <p className="mt-2 leading-7 text-[#5f6962]">
          Private to you. Start with one repeatable action you can check in on.
        </p>

        <HabitForm action={createHabitAction} />
      </section>
    </main>
  );
}
