"use client";

import { useActionState, useState } from "react";
import {
  INITIAL_MODERATION_ACTION_STATE,
  type ModerationActionState,
} from "@/src/lib/communities/community-form-state";

type ModerationAction = (
  state: ModerationActionState,
  formData: FormData,
) => Promise<ModerationActionState>;

// One generic moderation action button (promote / demote / remove / ban /
// unban / remove-post): a single control, an optional confirm step for
// destructive actions, and a safe inline error. The target is always bound
// into `action` by the caller — never a form field.
export function ModerationActionButton({
  action,
  label,
  pendingLabel,
  confirmText,
  destructive = false,
  reasonField = false,
}: {
  action: ModerationAction;
  label: string;
  pendingLabel: string;
  /** When set, a confirm step shows this text before the action fires. */
  confirmText?: string;
  destructive?: boolean;
  /** When true, renders an optional "reason" text field alongside the button. */
  reasonField?: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    action,
    INITIAL_MODERATION_ACTION_STATE,
  );
  const [confirming, setConfirming] = useState(false);

  const buttonClass = destructive
    ? "min-h-9 rounded-full px-3 text-xs font-semibold text-[#8c3527] transition hover:bg-[#fff0ed] disabled:cursor-wait disabled:opacity-60"
    : "min-h-9 rounded-full border border-[#cfc8bb] px-3 text-xs font-semibold text-[#3e4a41] transition hover:bg-[#f7f4ee] disabled:cursor-wait disabled:opacity-60";

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
        {confirmText && (
          <span className="text-xs text-[#5f6962]">{confirmText}</span>
        )}
        {reasonField && (
          <input
            type="text"
            name="reason"
            placeholder="Reason (optional)"
            maxLength={500}
            className="min-h-9 w-40 rounded-lg border border-[#cfc8bb] px-2 text-xs outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
          />
        )}
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? pendingLabel : label}
        </button>
        {confirmText && (
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="min-h-9 rounded-full px-2 text-xs font-semibold text-[#4d574f] hover:underline"
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
