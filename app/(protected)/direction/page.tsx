import { requireCompletedProfile } from "@/src/lib/auth";
import { todayIsoDate } from "@/src/lib/app/date";
import { getDirectionForDate, listRecentDirections } from "@/src/lib/direction/direction-data";
import { listGoalOptions } from "@/src/lib/goals/goals-data";
import { listHabitOptions } from "@/src/lib/habits/habits-data";
import { directionStatusLabel, formatDirectionDate } from "@/src/lib/direction/direction-labels";
import { DirectionForm } from "@/src/components/direction/direction-form";
import { DirectionStatusActions } from "@/src/components/direction/direction-status-actions";
import { RecentDirectionsList } from "@/src/components/direction/recent-directions-list";
import { createDirectionAction, updateDirectionAction } from "@/app/(protected)/direction/actions";

export const metadata = {
  title: "Daily Direction",
};

export default async function DirectionPage() {
  const { supabase, userId } = await requireCompletedProfile();
  const today = todayIsoDate();

  const [direction, recent, goalOptions, habitOptions] = await Promise.all([
    getDirectionForDate(supabase, userId, today),
    listRecentDirections(supabase, userId),
    listGoalOptions(supabase, userId),
    listHabitOptions(supabase, userId),
  ]);

  const pastDirections = recent.filter((row) => row.direction_date !== today);

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-6 sm:py-14">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6f7b4f]">
          {formatDirectionDate(today)}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Your Daily Direction
        </h1>
        <p className="mt-2 leading-7 text-[#5f6962]">
          What matters most for you today? Private to you — takes less than a
          minute to set.
        </p>
      </header>

      <section className="rounded-3xl border border-[#ded7c9] bg-white p-6 sm:p-9">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Today</h2>
          <span
            role="status"
            className="rounded-full border border-[#cfc8bb] px-3 py-1.5 text-sm font-semibold text-[#4d574f]"
          >
            {direction ? directionStatusLabel(direction.status) : "Not set"}
          </span>
        </div>

        <div className="mt-6">
          <DirectionForm
            action={
              direction
                ? updateDirectionAction.bind(null, direction.id)
                : createDirectionAction
            }
            initialValues={
              direction
                ? {
                    intention: direction.intention ?? "",
                    desiredIdentity: direction.desired_identity ?? "",
                    primaryAction: direction.primary_action,
                    whyItMatters: direction.why_it_matters ?? "",
                    goalId: direction.goal_id ? String(direction.goal_id) : "",
                    habitId: direction.habit_id ? String(direction.habit_id) : "",
                  }
                : undefined
            }
            submitLabel={direction ? "Save changes" : "Save today's direction"}
            goalOptions={goalOptions}
            habitOptions={habitOptions}
          />
        </div>

        {direction && (
          <div className="mt-6 border-t border-[#ece7de] pt-6">
            <DirectionStatusActions directionId={direction.id} status={direction.status} />
          </div>
        )}
      </section>

      <section aria-labelledby="recent-directions-heading" className="mt-10">
        <h2 id="recent-directions-heading" className="mb-4 text-lg font-semibold">
          Recent directions
        </h2>
        <RecentDirectionsList directions={pastDirections} />
      </section>
    </main>
  );
}
