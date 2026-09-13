"use client";

import { useActionState, useState } from "react";
import {
  INITIAL_DELETE_JOURNAL_ENTRY_STATE,
  type DeleteJournalEntryState,
} from "@/src/lib/journal/journal-form-state";

type DeleteAction = (
  state: DeleteJournalEntryState,
  formData: FormData,
) => Promise<DeleteJournalEntryState>;

// Hard delete, owner only, always behind an explicit confirmation step — see
// deleteJournalEntryAction() and docs/GOALS_HABITS_JOURNAL.md for why a
// journal entry (unlike a goal or habit) is allowed to be deleted outright.
export function JournalDeleteButton({ action }: { action: DeleteAction }) {
  const [state, formAction, pending] = useActionState(
    action,
    INITIAL_DELETE_JOURNAL_ENTRY_STATE,
  );
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="min-h-10 rounded-full px-4 text-sm font-semibold text-[#8c3527] transition hover:bg-[#fff0ed]"
      >
        Delete entry
      </button>
    );
  }

  return (
    <div>
      <form action={formAction} className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-[#5f6962]">
          Delete this entry permanently? This cannot be undone.
        </span>
        <button
          type="submit"
          disabled={pending}
          className="min-h-10 rounded-full bg-[#8c3527] px-4 text-sm font-semibold text-white transition hover:bg-[#732b20] disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? "Deleting…" : "Confirm delete"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="min-h-10 rounded-full px-3 text-sm font-semibold text-[#4d574f] hover:underline"
        >
          Cancel
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
