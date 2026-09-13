"use client";

import { useActionState, useState } from "react";
import {
  INITIAL_CHECKIN_STATE,
  type CheckinFormState,
} from "@/src/lib/habits/habit-form-state";
import { CHECKIN_NOTE_MAX } from "@/src/lib/habits/habit-validation";

type CheckinAction = (
  state: CheckinFormState,
  formData: FormData,
) => Promise<CheckinFormState>;

// The habit detail page's fuller check-in form: a numeric value (for a habit
// tracked in counts, e.g. "glasses of water") and an optional note. The
// quick "Check in" tap on /habits posts value=1 with no note through the
// same server action.
export function HabitCheckinForm({
  action,
  targetPerPeriod,
}: {
  action: CheckinAction;
  targetPerPeriod: number;
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL_CHECKIN_STATE);
  const [note, setNote] = useState("");

  return (
    <form action={formAction} className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="checkinValue" className="block text-sm font-semibold">
            Value
          </label>
          <input
            id="checkinValue"
            name="value"
            type="number"
            min={1}
            max={1000}
            step={1}
            defaultValue={targetPerPeriod}
            className="mt-2 min-h-11 w-24 rounded-xl border border-[#cfc8bb] px-3 font-normal outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-full bg-[#263b2d] px-5 text-sm font-semibold text-white transition hover:bg-[#1d3024] disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? "Checking in…" : "Check in today"}
        </button>
      </div>
      <div>
        <label htmlFor="checkinNote" className="block text-sm font-semibold">
          Note <span className="font-normal text-[#69726c]">(optional)</span>
        </label>
        <input
          id="checkinNote"
          name="note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={CHECKIN_NOTE_MAX}
          className="mt-2 min-h-11 w-full rounded-xl border border-[#cfc8bb] px-4 font-normal outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
        />
      </div>
      <p role={state.status === "error" ? "alert" : undefined} className="min-h-5 text-sm text-[#9b3829]">
        {state.status === "error" ? state.message : ""}
      </p>
    </form>
  );
}
