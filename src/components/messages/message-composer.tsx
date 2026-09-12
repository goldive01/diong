"use client";

import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import {
  initialMessageFormState,
  type MessageFormState,
} from "@/src/lib/messages/message-form-state";
import {
  MESSAGE_BODY_MAX,
  normalizeMessageBody,
} from "@/src/lib/messages/message-validation";

type MessageAction = (
  state: MessageFormState,
  formData: FormData,
) => Promise<MessageFormState>;

// The message input pinned under a conversation thread. Controlled state, body
// preserved on a validation error, pending state, live length indicator,
// accessible error, cleared only after a confirmed successful send — the
// submit button stays disabled for the whole pending window so a second
// Enter/click cannot fire a duplicate send.
export function MessageComposer({
  action,
  onSent,
}: {
  action: MessageAction;
  onSent: (message: { id: number; body: string; createdAt: string }) => void;
}) {
  const [state, formAction, pending] = useActionState(
    action,
    initialMessageFormState(),
  );
  const [body, setBody] = useState("");
  const fieldRef = useRef<HTMLTextAreaElement>(null);

  // Reacts to a new action result once, after commit — never during render.
  // Deliberately keyed only on `state`, so this fires exactly once per new
  // submission result. The narrow, documented exception to
  // react-hooks/set-state-in-effect used throughout this codebase's forms
  // (see post-composer.tsx / comment-form.tsx): "clear the field after a
  // confirmed success" has no pure render-time derivation to fall back to.
  /* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect -- see comment above */
  useEffect(() => {
    if (state.status === "success") {
      setBody("");
      if (state.sentMessage) onSent(state.sentMessage);
    } else if (state.status === "error") {
      setBody(state.values.body);
      if (state.errors.body) fieldRef.current?.focus();
    }
  }, [state]);
  /* eslint-enable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (normalizeMessageBody(body).length === 0) {
      event.preventDefault();
      fieldRef.current?.focus();
    }
  }

  const length = normalizeMessageBody(body).length;
  const over = length > MESSAGE_BODY_MAX;
  const errorId = "message-body-error";

  return (
    <form
      action={formAction}
      onSubmit={handleSubmit}
      noValidate
      className="border-t border-[#ded7c9] bg-white p-4 sm:p-5"
    >
      <label htmlFor="message-body" className="sr-only">
        Write a message
      </label>
      <textarea
        id="message-body"
        name="body"
        ref={fieldRef}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        rows={2}
        required
        placeholder="Write a message…"
        aria-invalid={Boolean(state.status === "error" && state.errors.body)}
        aria-describedby={errorId}
        className="w-full resize-none rounded-xl border border-[#cfc8bb] px-4 py-3 font-normal leading-6 outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
      />
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
        <p id={errorId} role={state.status === "error" ? "alert" : undefined} className="min-h-5 text-sm text-[#9b3829]">
          {state.status === "error" ? (state.errors.body ?? state.message) : ""}
        </p>
        <span
          className={`text-xs ${over ? "font-semibold text-[#9b3829]" : "text-[#69726c]"}`}
        >
          {length.toLocaleString()}/{MESSAGE_BODY_MAX.toLocaleString()}
        </span>
      </div>
      <div className="mt-2 flex justify-end">
        <button
          type="submit"
          disabled={pending || over || length === 0}
          className="min-h-11 rounded-full bg-[#263b2d] px-6 text-sm font-semibold text-white transition hover:bg-[#1d3024] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send"}
        </button>
      </div>
    </form>
  );
}
