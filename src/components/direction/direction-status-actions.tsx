import type { DailyDirectionStatus } from "@/src/types/database";
import { DirectionActionButton } from "@/src/components/direction/direction-action-button";
import { setDirectionStatusAction } from "@/app/(protected)/direction/actions";

// Status controls for today's direction. Which buttons are shown depends
// only on the direction's current status — the direct table update inside
// setDirectionStatusAction is what's actually authoritative
// (apply_direction_completion_status() sets/clears completed_at); this
// component only decides what's worth *showing*. Deliberately restrained —
// no confetti, no loud celebration copy, matching the brief.
export function DirectionStatusActions({
  directionId,
  status,
}: {
  directionId: number;
  status: DailyDirectionStatus;
}) {
  if (status === "active") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <DirectionActionButton
          action={setDirectionStatusAction.bind(null, directionId, "completed")}
          label="Mark complete"
          pendingLabel="Completing…"
          variant="primary"
        />
        <DirectionActionButton
          action={setDirectionStatusAction.bind(null, directionId, "skipped")}
          label="Skip today"
          pendingLabel="Skipping…"
          confirmText="Skip today's direction?"
          variant="quiet"
        />
      </div>
    );
  }

  if (status === "completed") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-[#3e6b45]">Direction completed</p>
        <DirectionActionButton
          action={setDirectionStatusAction.bind(null, directionId, "active")}
          label="Reopen"
          pendingLabel="Reopening…"
          variant="quiet"
        />
      </div>
    );
  }

  // skipped
  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="text-sm text-[#5f6962]">Skipped for today.</p>
      <DirectionActionButton
        action={setDirectionStatusAction.bind(null, directionId, "active")}
        label="Set as active"
        pendingLabel="Updating…"
        variant="quiet"
      />
    </div>
  );
}
