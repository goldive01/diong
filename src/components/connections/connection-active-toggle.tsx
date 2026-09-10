"use client";

import { useActionState } from "react";
import type { ConnectionActiveState } from "@/src/lib/connections/connection-form-state";

const initialState: ConnectionActiveState = { status: "idle", message: "" };

// The bound server action takes no arguments: the connection id is bound on the
// server and the direction is fixed by which action the parent passes in.
type ConnectionActiveAction = () => Promise<ConnectionActiveState>;

// One button. The parent passes the bound deactivate OR reactivate action plus
// the current state, and re-keys this component when is_active changes so the
// action-state message resets.
export function ConnectionActiveToggle({
  isActive,
  action,
}: {
  isActive: boolean;
  action: ConnectionActiveAction;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <p className="text-sm leading-6 text-[#5f6962]">
        {isActive
          ? "An inactive connection stays here with its full interaction history, but no longer appears on your dashboard or in reminders."
          : "Reactivating brings this connection back to your dashboard and reminders. Its history is unchanged."}
      </p>
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-full border border-[#cfc8bb] px-5 text-sm font-semibold text-[#3e4a41] hover:bg-white disabled:cursor-wait disabled:opacity-60"
      >
        {pending
          ? "Saving…"
          : isActive
            ? "Set as inactive"
            : "Reactivate connection"}
      </button>
      {state.message && (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={`text-sm ${
            state.status === "error" ? "text-[#9b3f37]" : "text-[#526a55]"
          }`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
