"use client";

import { useActionState } from "react";
import {
  INITIAL_CHECKIN_STATE,
  type CheckinFormState,
} from "@/src/lib/habits/habit-form-state";

type CheckinAction = (
  state: CheckinFormState,
  formData: FormData,
) => Promise<CheckinFormState>;
type UndoAction = (state: CheckinFormState, formData: FormData) => Promise<CheckinFormState>;

// Quick daily check-in / undo toggle for one habit — used on both /habits
// (compact) and the habit detail page. A plain "done today" tap posts
// value=1 with no note; the detail page's fuller check-in form (with a
// custom value/note) posts through the same checkInAction.
export function HabitCheckinButton({
  checkedInToday,
  checkInAction,
  undoAction,
  habitName,
}: {
  checkedInToday: boolean;
  checkInAction: CheckinAction;
  undoAction: UndoAction;
  habitName: string;
}) {
  const [checkInState, checkInFormAction, checkInPending] = useActionState(
    checkInAction,
    INITIAL_CHECKIN_STATE,
  );
  const [undoState, undoFormAction, undoPending] = useActionState(
    undoAction,
    INITIAL_CHECKIN_STATE,
  );

  const state = checkedInToday ? undoState : checkInState;

  if (checkedInToday) {
    return (
      <div>
        <form action={undoFormAction}>
          <button
            type="submit"
            disabled={undoPending}
            aria-label={`Undo today's check-in for ${habitName}`}
            className="min-h-10 rounded-full border border-[#cfc8bb] bg-[#eef2e5] px-4 text-sm font-semibold text-[#42512a] transition hover:bg-white disabled:cursor-wait disabled:opacity-60"
          >
            {undoPending ? "Undoing…" : "Checked in ✓ (undo)"}
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

  return (
    <div>
      <form action={checkInFormAction}>
        <input type="hidden" name="value" value="1" />
        <button
          type="submit"
          disabled={checkInPending}
          aria-label={`Check in ${habitName} for today`}
          className="min-h-10 rounded-full bg-[#263b2d] px-4 text-sm font-semibold text-white transition hover:bg-[#1d3024] disabled:cursor-wait disabled:opacity-60"
        >
          {checkInPending ? "Checking in…" : "Check in"}
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
