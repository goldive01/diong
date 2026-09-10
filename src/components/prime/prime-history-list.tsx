import Link from "next/link";
import {
  describeCompletionState,
  formatAssignedDate,
  formatCompletedAt,
  type PrimeHistoryItem,
} from "@/src/lib/prime-history";

// One calm row per assigned Prime. Links to the historical detail. Never shows
// the reflection text itself — only whether one exists.
export function PrimeHistoryList({ items }: { items: PrimeHistoryItem[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const completedAt = formatCompletedAt(item.completedAt);
        return (
          <li key={item.id}>
            <Link
              href={`/daily-prime/history/${item.id}`}
              className="block rounded-2xl border border-[#e0dacd] bg-white p-5 outline-none transition hover:border-[#b9c3a3] focus-visible:ring-2 focus-visible:ring-[#6f7b4f]/30"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#6f7b4f]">
                {item.categoryName ?? "Prime"}
              </p>
              <p className="mt-1 text-lg font-semibold tracking-tight text-[#1d2420]">
                {item.title ?? "Prime protocol"}
              </p>
              <p className="mt-1 text-sm text-[#5f6962]">
                {formatAssignedDate(item.assignedDate)}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#5a655c]">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    item.completed
                      ? "bg-[#eef2e5] text-[#3e4a41]"
                      : "bg-[#efe7dd] text-[#6b5b45]"
                  }`}
                >
                  {describeCompletionState(item.completed)}
                </span>
                {item.completed && completedAt && (
                  <span>Completed {completedAt}</span>
                )}
                {item.hasReflection && (
                  <span>
                    <span aria-hidden="true">· </span>Reflection saved
                  </span>
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
