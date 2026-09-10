import type { PrimeProgress } from "@/src/lib/prime-progress";

type Stat = { label: string; value: string };

function formatDayCount(count: number): string {
  return count === 1 ? "1 day" : `${count} days`;
}

// A calm, text-only progress summary. Real counts from the user's own
// assignment and completion records — no charts, no scores, no projections.
export function PrimeProgressSummary({ progress }: { progress: PrimeProgress }) {
  const stats: Stat[] = [
    { label: "Prime days", value: String(progress.totalAssigned) },
    { label: "Completed", value: String(progress.totalCompleted) },
    { label: "Completion rate", value: `${progress.completionRate}%` },
    { label: "Current streak", value: formatDayCount(progress.currentStreak) },
    { label: "Longest streak", value: formatDayCount(progress.longestStreak) },
  ];

  return (
    <section
      aria-labelledby="prime-progress-heading"
      className="rounded-3xl border border-[#ded7c9] bg-white p-6 sm:p-8"
    >
      <h2
        id="prime-progress-heading"
        className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6f7b4f]"
      >
        Your practice so far
      </h2>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label}>
            <dt className="text-sm text-[#68716b]">{stat.label}</dt>
            <dd className="mt-1 text-2xl font-semibold tracking-tight text-[#1d2420]">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs leading-5 text-[#7a8378]">
        Counted from the Primes assigned to you and the ones you marked complete.
        A streak counts consecutive days you completed your Prime.
      </p>
    </section>
  );
}
