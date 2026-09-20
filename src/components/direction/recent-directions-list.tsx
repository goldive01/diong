import type { RecentDirection } from "@/src/lib/direction/direction-data";
import { directionStatusLabel, formatDirectionDate } from "@/src/lib/direction/direction-labels";

// A short, bounded history list — date, intention (or the primary action if
// no intention was set), and status. No streaks, no charts, no analytics
// dashboard, matching the brief's "do not build a complex analytics
// dashboard yet."
export function RecentDirectionsList({
  directions,
}: {
  directions: RecentDirection[];
}) {
  if (directions.length === 0) {
    return (
      <p className="text-sm text-[#68716b]">
        Your recent directions will appear here once you set one.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-[#ece7de] rounded-2xl border border-[#e0dacd] bg-white">
      {directions.map((direction) => (
        <li key={direction.id} className="px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6f7b4f]">
                {formatDirectionDate(direction.direction_date)}
              </p>
              <p className="mt-1 text-sm text-[#3e4a41]">
                {direction.intention || direction.primary_action}
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-[#cfc8bb] px-2.5 py-1 text-xs font-semibold text-[#4d574f]">
              {directionStatusLabel(direction.status)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
