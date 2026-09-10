"use client";

import { useActionState, useId, useRef, useState, type FormEvent } from "react";
import {
  PRIME_REFLECTION_MAX_LENGTH,
  normalizePrimeReflection,
  validatePrimeReflection,
  type SavePrimeReflectionState,
} from "@/src/lib/prime-reflection";

type PrimeReflectionAction = (
  state: SavePrimeReflectionState,
  formData: FormData,
) => Promise<SavePrimeReflectionState>;

// Reflection for today's completed Prime. The assignment id is bound to the
// server action by the page, so this form posts only the reflection text.
export function PrimeReflectionForm({
  action,
  prompt,
  initialReflection,
}: {
  action: PrimeReflectionAction;
  prompt: string;
  initialReflection: string;
}) {
  const initialState: SavePrimeReflectionState = {
    status: initialReflection ? "success" : "idle",
    message: "",
    values: { reflection: initialReflection },
  };
  const [state, formAction, pending] = useActionState(action, initialState);
  const [value, setValue] = useState(initialReflection);
  const [clientError, setClientError] = useState<string | undefined>(undefined);
  const [handledState, setHandledState] = useState(state);
  const formRef = useRef<HTMLFormElement>(null);

  const fieldId = useId();
  const labelId = `${fieldId}-label`;
  const helpId = `${fieldId}-help`;
  const errorId = `${fieldId}-error`;

  // When a server result comes back, re-sync the textarea to the value the
  // server echoed (trimmed on success, unchanged on validation failure) and
  // drop any stale client-side error. Done in render, React's supported
  // "adjust state on prop/state change" pattern.
  if (state !== handledState) {
    setHandledState(state);
    setValue(state.values.reflection);
    setClientError(undefined);
  }

  const error = clientError ?? state.error;
  const remaining = PRIME_REFLECTION_MAX_LENGTH - value.length;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const found = validatePrimeReflection(normalizePrimeReflection(value));
    if (found) {
      event.preventDefault();
      setClientError(found);
      formRef.current?.querySelector("textarea")?.focus();
      return;
    }
    setClientError(undefined);
  }

  return (
    <section
      aria-labelledby={labelId}
      className="rounded-3xl border border-[#ded7c9] bg-white p-6 sm:p-8"
    >
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6f7b4f]">
        Reflection
      </p>
      <h2 id={labelId} className="mt-2 text-xl font-semibold text-[#1d2420]">
        {prompt}
      </h2>
      <p className="mt-1 text-sm text-[#5f6962]">
        Optional. Only you can see this, and you can update it later today.
      </p>

      <form
        ref={formRef}
        action={formAction}
        onSubmit={handleSubmit}
        noValidate
        className="mt-4"
      >
        <label htmlFor={fieldId} className="sr-only">
          {prompt}
        </label>
        <textarea
          id={fieldId}
          name="reflection"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            if (clientError) setClientError(undefined);
          }}
          rows={5}
          maxLength={PRIME_REFLECTION_MAX_LENGTH}
          aria-invalid={Boolean(error)}
          aria-describedby={`${helpId} ${errorId}`}
          className="w-full rounded-xl border border-[#cfc8bb] px-4 py-3 leading-7 outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
        />
        <p id={helpId} className="mt-1 text-xs text-[#69726c]">
          {remaining} characters remaining
        </p>
        <p id={errorId} className="mt-1 min-h-5 text-sm text-[#9b3829]">
          {error ?? ""}
        </p>

        {!error && state.message && (
          <p
            role={state.status === "error" ? "alert" : "status"}
            className={`text-sm ${
              state.status === "error" ? "text-[#9b3f37]" : "text-[#526a55]"
            }`}
          >
            {state.message}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-4 min-h-12 rounded-full bg-[#263b2d] px-6 font-semibold text-white transition hover:bg-[#1d3024] disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save reflection"}
        </button>
      </form>
    </section>
  );
}
