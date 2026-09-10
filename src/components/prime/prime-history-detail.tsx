import Link from "next/link";
import {
  formatAssignedDate,
  formatCompletedAt,
  type PrimeHistoryDetail,
} from "@/src/lib/prime-history";

type Row = { label: string; value: string | null };

// Read-only view of one past (or today's) Prime assignment. Reflection editing
// lives only on /daily-prime and only for today's Prime; this page links there
// when the assignment is today's.
export function PrimeHistoryDetailView({
  detail,
}: {
  detail: PrimeHistoryDetail;
}) {
  const completedAt = formatCompletedAt(detail.completedAt);
  const rows: Row[] = [
    { label: "Purpose", value: detail.purpose },
    { label: "Best time", value: detail.bestTime },
    { label: "Tomorrow's expectation", value: detail.tomorrowsExpectation },
  ];
  const visibleRows = rows.filter(
    (row): row is { label: string; value: string } => Boolean(row.value),
  );

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-6 sm:py-14">
      <Link
        href="/daily-prime/history"
        className="text-sm font-semibold text-[#59654a] hover:underline"
      >
        ← Back to Prime history
      </Link>

      <header className="mt-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6f7b4f]">
          {detail.categoryName ?? "Prime"}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          {detail.title ?? "Prime protocol"}
        </h1>
        <p className="mt-2 text-sm text-[#5f6962]">
          {formatAssignedDate(detail.assignedDate)}
        </p>
      </header>

      <section className="mt-6 rounded-3xl border border-[#ded7c9] bg-white p-6 sm:p-8">
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
            detail.completed
              ? "bg-[#eef2e5] text-[#3e4a41]"
              : "bg-[#efe7dd] text-[#6b5b45]"
          }`}
        >
          {detail.completed ? "Completed" : "Not completed"}
        </span>
        {detail.completed && completedAt && (
          <p className="mt-2 text-sm text-[#5a655c]">
            Action Trigger completed {completedAt}
          </p>
        )}
      </section>

      {detail.primeText && (
        <section className="mt-6 rounded-3xl border border-[#ded7c9] bg-white p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6f7b4f]">
            Prime
          </p>
          <p className="mt-3 text-lg leading-8 text-[#27302a]">
            {detail.primeText}
          </p>
        </section>
      )}

      {detail.actionTrigger && (
        <section className="mt-6 rounded-3xl border border-[#d7dfcf] bg-[#eef2e5] p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#5d704b]">
            Action Trigger
          </p>
          <p className="mt-3 text-lg font-medium leading-8 text-[#26352b]">
            {detail.actionTrigger}
          </p>
        </section>
      )}

      {visibleRows.length > 0 && (
        <section className="mt-6 rounded-3xl border border-[#ded7c9] bg-white p-6 sm:p-8">
          <dl className="divide-y divide-[#ece7de]">
            {visibleRows.map((row) => (
              <div key={row.label} className="py-3 first:pt-0 last:pb-0">
                <dt className="text-sm font-semibold text-[#3e4a41]">
                  {row.label}
                </dt>
                <dd className="mt-1 leading-7 text-[#5a655c]">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section className="mt-6 rounded-3xl border border-[#ded7c9] bg-white p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6f7b4f]">
          Reflection
        </p>
        {detail.reflectionPrompt && (
          <p className="mt-2 font-medium text-[#3e4a41]">
            {detail.reflectionPrompt}
          </p>
        )}
        <p className="mt-2 whitespace-pre-wrap leading-7 text-[#4f5952]">
          {detail.reflection
            ? detail.reflection
            : "No reflection saved for this day."}
        </p>
        {detail.isToday && (
          <Link
            href="/daily-prime"
            className="mt-4 inline-block text-sm font-semibold text-[#59654a] hover:underline"
          >
            {detail.completed
              ? "Add or update today's reflection on Daily Prime"
              : "Open today's Daily Prime"}
          </Link>
        )}
      </section>
    </main>
  );
}
