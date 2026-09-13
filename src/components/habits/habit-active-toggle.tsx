"use client";

import { useActionState } from "react";
import {
  INITIAL_HABIT_ACTIVE_STATE,
  type HabitActiveState,
} from "@/src/lib/habits/habit-form-state";

type ActiveAction = (
  state: HabitActiveState,
  formData: FormData,
) => Promise<HabitActiveState>;

export function HabitActiveToggle({
  isActive,
  archiveAction,
  reactivateAction,
}: {
  isActive: boolean;
  archiveAction: ActiveAction;
  reactivateAction: ActiveAction;
}) {
  const action = isActive ? archiveAction : reactivateAction;
  const [state, formAction, pending] = useActionState(
    action,
    INITIAL_HABIT_ACTIVE_STATE,
  );

  return (
    <div>
      <form action={formAction}>
        <button
          type="submit"
          disabled={pending}
          className="min-h-10 rounded-full border border-[#cfc8bb] px-4 text-sm font-semibold text-[#3e4a41] transition hover:bg-[#f7f4ee] disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? "Working…" : isActive ? "Archive habit" : "Reactivate habit"}
        </button>
      </form>
      {state.status === "error" && state.message && (
        <p role="alert" className="mt-1 text-xs text-[#9b3f37]">
          {state.message}
        </p>
      )}
    </div>
  );
}
