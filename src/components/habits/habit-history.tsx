import { formatCheckinDate } from "@/src/lib/habits/habit-labels";

export type HistoryEntry = { checkin_date: string; value: number; note: string | null };

// Read-only check-in history, newest first, bounded by the caller
// (RECENT_CHECKIN_LIMIT in habits-data.ts) — never an unlimited list.
export function HabitHistory({ checkins }: { checkins: HistoryEntry[] }) {
  if (checkins.length === 0) {
    return <p className="text-sm text-[#68716b]">No check-ins recorded yet.</p>;
  }

  return (
    <ul className="divide-y divide-[#ece7de] rounded-2xl border border-[#e0dacd] bg-white">
      {checkins.map((checkin) => (
        <li key={checkin.checkin_date} className="flex items-start justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#1d2420]">
              {formatCheckinDate(checkin.checkin_date)}
            </p>
            {checkin.note && (
              <p className="mt-0.5 text-sm text-[#5f6962]">{checkin.note}</p>
            )}
          </div>
          <span className="shrink-0 rounded-full bg-[#eef2e5] px-2.5 py-1 text-xs font-semibold text-[#42512a]">
            {checkin.value}
          </span>
        </li>
      ))}
    </ul>
  );
}
