"use client";

import { useActionState, useState } from "react";
import {
  INITIAL_DIRECTION_ACTION_STATE,
  type DirectionActionState,
} from "@/src/lib/direction/direction-form-state";

type DirectionAction = (
  state: DirectionActionState,
  formData: FormData,
) => Promise<DirectionActionState>;

// One generic direction status button (complete / skip / reopen): a single
// control, an optional confirm step, and a safe inline error. The target is
// always bound into `action` by the caller — never a form field. Mirrors
// src/components/goals/goal-action-button.tsx.
export function DirectionActionButton({
  action,
  label,
  pendingLabel,
  confirmText,
  variant = "default",
}: {
  action: DirectionAction;
  label: string;
  pendingLabel: string;
  confirmText?: string;
  variant?: "default" | "primary" | "quiet";
}) {
  const [state, formAction, pending] = useActionState(
    action,
    INITIAL_DIRECTION_ACTION_STATE,
  );
  const [confirming, setConfirming] = useState(false);

  const buttonClass =
    variant === "primary"
      ? "min-h-11 rounded-full bg-[#263b2d] px-5 text-sm font-semibold text-white transition hover:bg-[#1d3024] disabled:cursor-wait disabled:opacity-60"
      : variant === "quiet"
        ? "min-h-11 rounded-full px-4 text-sm font-semibold text-[#4d574f] transition hover:bg-[#f7f4ee] disabled:cursor-wait disabled:opacity-60"
        : "min-h-11 rounded-full border border-[#cfc8bb] px-4 text-sm font-semibold text-[#3e4a41] transition hover:bg-[#f7f4ee] disabled:cursor-wait disabled:opacity-60";

  if (confirmText && !confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className={buttonClass}>
        {label}
      </button>
    );
  }

  return (
    <div>
      <form action={formAction} className="flex flex-wrap items-center gap-2">
        {confirmText && <span className="text-xs text-[#5f6962]">{confirmText}</span>}
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? pendingLabel : label}
        </button>
        {confirmText && (
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="min-h-11 rounded-full px-2 text-xs font-semibold text-[#4d574f] hover:underline"
          >
            Cancel
          </button>
        )}
      </form>
      {state.status === "error" && state.message && (
        <p role="alert" className="mt-1 text-xs text-[#9b3f37]">
          {state.message}
        </p>
      )}
    </div>
  );
}
