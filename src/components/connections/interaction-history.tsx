import type { RecentInteraction } from "@/src/lib/connections/connections-data";
import {
  formatInteractionMoment,
  INTERACTION_TYPE_LABEL,
} from "@/src/lib/connections/connection-labels";

// Read-only interaction log. Newest first (the query already orders by
// occurred_at descending). Interactions are append-only in V1: no edit, no
// delete.
export function InteractionHistory({
  interactions,
}: {
  interactions: RecentInteraction[];
}) {
  if (interactions.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-[#d8d1c4] px-4 py-6 text-sm text-[#68716b]">
        No interactions recorded yet. When you record one, it will appear here.
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {interactions.map((interaction) => (
        <li
          key={interaction.id}
          className="rounded-2xl border border-[#e4ded2] bg-white p-4"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="font-semibold text-[#1d2420]">
              {INTERACTION_TYPE_LABEL[interaction.interaction_type]}
            </p>
            <p className="text-sm text-[#6b746d]">
              <time dateTime={interaction.occurred_at}>
                {formatInteractionMoment(interaction.occurred_at)}
              </time>
            </p>
          </div>
          {interaction.notes && (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#4f5952]">
              {interaction.notes}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
