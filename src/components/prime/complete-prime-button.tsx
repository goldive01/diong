"use client";

import { useActionState } from "react";
import {
  completeDailyPrime,
  type CompletePrimeState,
} from "@/app/(protected)/daily-prime/actions";

const initialState: CompletePrimeState = { status: "idle", message: "" };

export function CompletePrimeButton({ assignmentId }: { assignmentId: number }) {
  const [state, formAction, isPending] = useActionState(
    completeDailyPrime,
    initialState,
  );

  return (
    <form action={formAction} className="mt-6">
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <button
        type="submit"
        disabled={isPending}
        className="min-h-12 w-full rounded-full bg-[#263b2d] px-5 py-3 font-semibold text-white transition hover:bg-[#1d3024] disabled:cursor-wait disabled:opacity-65 sm:w-auto"
      >
        {isPending ? "Saving…" : "Mark Action Trigger complete"}
      </button>
      <p
        aria-live="polite"
        className={`mt-3 text-sm ${
          state.status === "error" ? "text-[#9b3f37]" : "text-[#526a55]"
        }`}
      >
        {state.message}
      </p>
    </form>
  );
}
