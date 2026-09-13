import type { GoalStatus } from "@/src/types/database";
import { GoalActionButton } from "@/src/components/goals/goal-action-button";
import { setGoalStatusAction } from "@/app/(protected)/goals/[id]/actions";

// Status controls for one goal's detail page. Which buttons are shown
// depends only on the goal's current status — the RPC-free direct table
// update inside setGoalStatusAction is what's actually authoritative
// (apply_goal_completion_status() sets completed_at / forces
// progress_percent=100 on entering 'completed', and clears completed_at on
// leaving it); this component only decides what's worth *showing*.
export function GoalStatusActions({
  goalId,
  status,
}: {
  goalId: number;
  status: GoalStatus;
}) {
  if (status === "active") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <GoalActionButton
          action={setGoalStatusAction.bind(null, goalId, "paused")}
          label="Pause"
          pendingLabel="Pausing…"
        />
        <GoalActionButton
          action={setGoalStatusAction.bind(null, goalId, "completed")}
          label="Mark complete"
          pendingLabel="Completing…"
          confirmText="Mark this goal complete? Progress will be set to 100%."
          variant="primary"
        />
        <GoalActionButton
          action={setGoalStatusAction.bind(null, goalId, "archived")}
          label="Archive"
          pendingLabel="Archiving…"
          confirmText="Archive this goal?"
          variant="quiet"
        />
      </div>
    );
  }

  if (status === "paused") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <GoalActionButton
          action={setGoalStatusAction.bind(null, goalId, "active")}
          label="Resume"
          pendingLabel="Resuming…"
          variant="primary"
        />
        <GoalActionButton
          action={setGoalStatusAction.bind(null, goalId, "completed")}
          label="Mark complete"
          pendingLabel="Completing…"
          confirmText="Mark this goal complete? Progress will be set to 100%."
        />
        <GoalActionButton
          action={setGoalStatusAction.bind(null, goalId, "archived")}
          label="Archive"
          pendingLabel="Archiving…"
          confirmText="Archive this goal?"
          variant="quiet"
        />
      </div>
    );
  }

  if (status === "completed") {
    return (
      <GoalActionButton
        action={setGoalStatusAction.bind(null, goalId, "active")}
        label="Reopen"
        pendingLabel="Reopening…"
        confirmText="Reopen this goal? It will return to Active."
      />
    );
  }

  // archived: terminal in this pass — no action offered.
  return null;
}
