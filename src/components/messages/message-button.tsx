"use client";

import { useActionState } from "react";
import {
  INITIAL_MESSAGE_BUTTON_STATE,
  type MessageButtonState,
} from "@/src/lib/messages/message-form-state";

type MessageProfileAction = (
  state: MessageButtonState,
  formData: FormData,
) => Promise<MessageButtonState>;

// "Message" control on a public profile. On success the bound server action
// redirects straight to the (possibly newly created) conversation; this
// component only ever needs to render a pending state or a safe error.
export function MessageButton({
  action,
  displayName,
}: {
  action: MessageProfileAction;
  displayName: string;
}) {
  const [state, formAction, pending] = useActionState(
    action,
    INITIAL_MESSAGE_BUTTON_STATE,
  );

  return (
    <div>
      <form action={formAction}>
        <button
          type="submit"
          disabled={pending}
          aria-label={`Message ${displayName}`}
          className="min-h-11 rounded-full border border-[#cfc8bb] px-5 text-sm font-semibold text-[#3e4a41] transition hover:bg-white disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#cfc8bb] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        >
          {pending ? "Opening…" : "Message"}
        </button>
      </form>
      {state.status === "error" && state.message && (
        <p role="alert" className="mt-2 text-sm text-[#9b3f37]">
          {state.message}
        </p>
      )}
    </div>
  );
}
