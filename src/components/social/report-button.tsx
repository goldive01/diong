"use client";

import { useActionState, useId, useState } from "react";
import { reportReasonOptions } from "@/src/lib/communities/report-validation";
import {
  INITIAL_REPORT_FORM_STATE,
  type ReportFormState,
} from "@/src/lib/communities/report-form-state";

type ReportAction = (
  state: ReportFormState,
  formData: FormData,
) => Promise<ReportFormState>;

// Understated "Report" control usable on a post, comment, profile or
// community. The target is bound into `action` by the caller (server-side —
// never a form field). Collapsed by default; reveals a small reason +
// optional-details form; never tells the reporter what moderation action, if
// any, will follow.
export function ReportButton({
  action,
  label = "Report",
}: {
  action: ReportAction;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    action,
    INITIAL_REPORT_FORM_STATE,
  );
  const reasonId = useId();
  const detailsId = useId();

  if (state.status === "success") {
    return (
      <p role="status" className="text-sm font-semibold text-[#44512e]">
        {state.message}
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-9 rounded-full px-2.5 py-1 text-xs font-semibold text-[#8b9384] transition hover:text-[#6b746d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f7b4f]/40"
      >
        {label}
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="mt-2 max-w-sm rounded-2xl border border-[#e4ded2] bg-[#f7f4ee] p-3"
    >
      <div>
        <label htmlFor={reasonId} className="block text-xs font-semibold">
          Reason
        </label>
        <select
          id={reasonId}
          name="reason"
          required
          defaultValue=""
          aria-invalid={Boolean(state.errors.reason)}
          className="mt-1 min-h-9 w-full rounded-lg border border-[#cfc8bb] bg-white px-2 text-sm outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
        >
          <option value="" disabled>
            Choose a reason
          </option>
          {reportReasonOptions().map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {state.errors.reason && (
          <p className="mt-1 text-xs text-[#9b3829]">{state.errors.reason}</p>
        )}
      </div>

      <div className="mt-2">
        <label htmlFor={detailsId} className="block text-xs font-semibold">
          Details <span className="font-normal text-[#69726c]">(optional)</span>
        </label>
        <textarea
          id={detailsId}
          name="details"
          rows={2}
          aria-invalid={Boolean(state.errors.details)}
          className="mt-1 w-full rounded-lg border border-[#cfc8bb] px-2 py-1.5 text-sm outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
        />
        {state.errors.details && (
          <p className="mt-1 text-xs text-[#9b3829]">{state.errors.details}</p>
        )}
      </div>

      {state.status === "error" && state.message && !hasFieldErrors(state) && (
        <p role="alert" className="mt-2 text-xs text-[#9b3829]">
          {state.message}
        </p>
      )}

      <div className="mt-2 flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="min-h-9 rounded-full bg-[#263b2d] px-3 text-xs font-semibold text-white transition hover:bg-[#1d3024] disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? "Sending…" : "Submit report"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="min-h-9 rounded-full px-3 text-xs font-semibold text-[#4d574f] hover:underline"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function hasFieldErrors(state: ReportFormState): boolean {
  return Object.keys(state.errors).length > 0;
}
