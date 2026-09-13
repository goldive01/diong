"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  INITIAL_ADD_MILESTONE_STATE,
  type AddMilestoneState,
} from "@/src/lib/goals/goal-form-state";
import {
  MILESTONE_TITLE_MAX,
  normalizeMilestoneTitle,
  validateMilestoneTitle,
} from "@/src/lib/goals/goal-validation";

type AddMilestoneAction = (
  state: AddMilestoneState,
  formData: FormData,
) => Promise<AddMilestoneState>;

export function AddMilestoneForm({ action }: { action: AddMilestoneAction }) {
  const [state, formAction, pending] = useActionState(
    action,
    INITIAL_ADD_MILESTONE_STATE,
  );
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const clientError = title.length > 0 ? validateMilestoneTitle(normalizeMilestoneTitle(title)) : undefined;

  /* eslint-disable react-hooks/set-state-in-effect -- clears the composer
     only on a new successful submit result, never during an unrelated
     re-render; see the identical, documented exception in
     community-post-composer.tsx. */
  useEffect(() => {
    if (state.status === "idle" && state.message === "") {
      setTitle("");
    }
  }, [state]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <form action={formAction} className="flex flex-wrap items-start gap-2">
      <div className="min-w-0 flex-1">
        <label htmlFor="milestoneTitle" className="sr-only">
          New milestone
        </label>
        <input
          id="milestoneTitle"
          ref={inputRef}
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={MILESTONE_TITLE_MAX}
          placeholder="Add a milestone"
          aria-invalid={Boolean(clientError)}
          aria-describedby="milestoneTitle-error"
          className="min-h-11 w-full rounded-xl border border-[#cfc8bb] px-4 font-normal outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
        />
        <p id="milestoneTitle-error" className="mt-1 min-h-5 text-sm text-[#9b3829]">
          {clientError ?? (state.status === "error" ? state.message : "")}
        </p>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 shrink-0 rounded-full bg-[#263b2d] px-5 text-sm font-semibold text-white transition hover:bg-[#1d3024] disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add"}
      </button>
    </form>
  );
}
