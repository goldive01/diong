"use client";

import { useActionState, useState } from "react";
import {
  INITIAL_GOAL_ACTION_STATE,
  type GoalActionState,
} from "@/src/lib/goals/goal-form-state";
import { validateProgressPercent } from "@/src/lib/goals/goal-validation";

type SetProgressAction = (
  state: GoalActionState,
  formData: FormData,
) => Promise<GoalActionState>;

export function GoalProgressForm({
  action,
  initialPercent,
  disabled,
}: {
  action: SetProgressAction;
  initialPercent: number;
  disabled: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    action,
    INITIAL_GOAL_ACTION_STATE,
  );
  const [value, setValue] = useState(String(initialPercent));
  const clientError = validateProgressPercent(Number(value));

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="progressPercent" className="block text-sm font-semibold">
          Progress
        </label>
        <div className="mt-2 flex items-center gap-2">
          <input
            id="progressPercent"
            name="progressPercent"
            type="number"
            min={0}
            max={100}
            step={1}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            disabled={disabled}
            aria-invalid={Boolean(clientError)}
            aria-describedby="progressPercent-error"
            className="min-h-11 w-24 rounded-xl border border-[#cfc8bb] px-3 font-normal outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <span className="text-sm text-[#5f6962]">%</span>
        </div>
      </div>
      <button
        type="submit"
        disabled={disabled || pending || Boolean(clientError)}
        className="min-h-11 rounded-full bg-[#263b2d] px-5 text-sm font-semibold text-white transition hover:bg-[#1d3024] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Saving…" : "Update progress"}
      </button>
      <p id="progressPercent-error" className="w-full min-h-5 text-sm text-[#9b3829]">
        {clientError ?? (state.status === "error" ? state.message : "")}
      </p>
    </form>
  );
}
