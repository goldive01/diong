"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  INITIAL_COMMENT_FORM_STATE,
  type CommentFormState,
} from "@/src/lib/social/post-form-state";
import {
  COMMENT_BODY_MAX,
  normalizePostBody,
} from "@/src/lib/social/post-validation";

type CommentAction = (
  state: CommentFormState,
  formData: FormData,
) => Promise<CommentFormState>;

// Shared comment / reply / edit form. `action` is a server action with the post
// (and parent comment or comment id) already bound on the server.
export function CommentForm({
  action,
  label,
  fieldId,
  initialBody = "",
  submitLabel = "Comment",
  pendingLabel = "Posting…",
  autoFocus = false,
  compact = false,
  onCancel,
  onSuccess,
}: {
  action: CommentAction;
  label: string;
  fieldId: string;
  initialBody?: string;
  submitLabel?: string;
  pendingLabel?: string;
  autoFocus?: boolean;
  compact?: boolean;
  onCancel?: () => void;
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    action,
    INITIAL_COMMENT_FORM_STATE,
  );
  const [body, setBody] = useState(initialBody);
  const [handled, setHandled] = useState<CommentFormState | null>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);

  if (state !== handled) {
    setHandled(state);
    if (state.status === "success") {
      setBody(compact ? initialBody : "");
      onSuccess?.();
    } else if (state.status === "error" && state.body) {
      setBody(state.body);
    }
  }

  useEffect(() => {
    if (autoFocus) fieldRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (state.status === "error" && state.errors.body) {
      fieldRef.current?.focus();
    }
  }, [state]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (normalizePostBody(body).length === 0) {
      event.preventDefault();
      fieldRef.current?.focus();
    }
  }

  const length = normalizePostBody(body).length;
  const over = length > COMMENT_BODY_MAX;
  const errorId = `${fieldId}-error`;

  return (
    <form
      action={formAction}
      onSubmit={handleSubmit}
      noValidate
      className={compact ? "mt-3" : "mt-4"}
    >
      <label htmlFor={fieldId} className="block text-sm font-semibold">
        {label}
      </label>
      <textarea
        id={fieldId}
        name="body"
        ref={fieldRef}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        rows={compact ? 2 : 3}
        required
        aria-invalid={Boolean(state.status === "error" && state.errors.body)}
        aria-describedby={errorId}
        className="mt-2 w-full rounded-xl border border-[#cfc8bb] px-4 py-3 font-normal leading-7 outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
      />
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
        <p id={errorId} className="min-h-5 text-sm text-[#9b3829]">
          {state.status === "error" ? (state.errors.body ?? state.message) : ""}
        </p>
        <span
          className={`text-xs ${over ? "font-semibold text-[#9b3829]" : "text-[#69726c]"}`}
        >
          {length}/{COMMENT_BODY_MAX}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={pending || over || length === 0}
          className="min-h-11 rounded-full bg-[#263b2d] px-5 text-sm font-semibold text-white transition hover:bg-[#1d3024] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? pendingLabel : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-full border border-[#cfc8bb] px-4 text-sm font-semibold text-[#3e4a41] hover:bg-white"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
