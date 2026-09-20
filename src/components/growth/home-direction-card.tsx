import Link from "next/link";
import type { DailyDirection } from "@/src/types/database";

// A concise Daily Direction card for /home — mirrors the restraint of
// HomeFocusPanel and HomeConnectionNudge. No streaks, no celebration
// animation, just today's state and a way to /direction. Never shows
// yesterday's or any other day's direction — Home only ever cares about
// "today."
export function HomeDirectionCard({
  direction,
}: {
  direction: DailyDirection | null;
}) {
  if (!direction) {
    return (
      <div className="rounded-3xl border border-[#ded7c9] bg-white p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6f7b4f]">
          Daily Direction
        </p>
        <h2 className="mt-2 text-lg font-semibold">Choose your direction for today</h2>
        <p className="mt-2 leading-7 text-[#5f6962]">
          Decide, in under a minute, what matters most and the one action
          you&apos;ll take.
        </p>
        <Link
          href="/direction"
          className="mt-4 inline-flex min-h-11 items-center rounded-full bg-[#263b2d] px-5 text-sm font-semibold text-white hover:bg-[#1d3024]"
        >
          Set today&apos;s direction
        </Link>
      </div>
    );
  }

  if (direction.status === "completed") {
    return (
      <div className="rounded-3xl border border-[#ded7c9] bg-[#eef2e5] p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6f7b4f]">
          Daily Direction
        </p>
        <h2 className="mt-2 text-lg font-semibold">Direction completed</h2>
        <p className="mt-2 leading-7 text-[#4f5952]">{direction.primary_action}</p>
        <Link
          href="/direction"
          className="mt-4 inline-block text-sm font-semibold text-[#59654a] hover:underline"
        >
          View today&apos;s direction
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-[#ded7c9] bg-white p-6 sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6f7b4f]">
        Daily Direction
      </p>
      {direction.intention && (
        <p className="mt-2 leading-7 text-[#4f5952]">{direction.intention}</p>
      )}
      <p className="mt-2 text-sm font-semibold text-[#3e4a41]">
        {direction.primary_action}
      </p>
      <Link
        href="/direction"
        className="mt-4 inline-flex min-h-11 items-center rounded-full bg-[#263b2d] px-5 text-sm font-semibold text-white hover:bg-[#1d3024]"
      >
        Open today&apos;s direction
      </Link>
    </div>
  );
}
