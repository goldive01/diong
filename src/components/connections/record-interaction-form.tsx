"use client";

import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import {
  EMPTY_INTERACTION_FORM,
  type InteractionFormValues,
  type RecordInteractionState,
} from "@/src/lib/connections/connection-form-state";
import {
  INTERACTION_NOTES_MAX,
  normalizeInteractionInput,
  validateInteractionInput,
  type InteractionErrors,
  type InteractionField,
} from "@/src/lib/connections/connection-validation";
import { INTERACTION_TYPE_LABEL } from "@/src/lib/connections/connection-labels";
import { INTERACTION_TYPES } from "@/src/lib/connections/connection-vocab";

const initialState: RecordInteractionState = {
  status: "idle",
  errors: {},
  message: "",
};

// Only the fields this form actually renders. connectionId is bound to the
// server action, never posted.
const FIELD_ORDER: InteractionField[] = ["interactionType", "occurredAt", "notes"];

type RecordInteractionAction = (
  state: RecordInteractionState,
  formData: FormData,
) => Promise<RecordInteractionState>;

export function RecordInteractionForm({
  action,
}: {
  action: RecordInteractionAction;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [values, setValues] = useState<InteractionFormValues>(
    EMPTY_INTERACTION_FORM,
  );
  const [clientErrors, setClientErrors] = useState<InteractionErrors>({});
  const [dismissals, setDismissals] = useState<{
    source: RecordInteractionState;
    fields: Set<InteractionField>;
  }>({ source: initialState, fields: new Set() });
  const [handledState, setHandledState] =
    useState<RecordInteractionState>(initialState);
  const formRef = useRef<HTMLFormElement>(null);

  // When a new result comes back, clear the form once so the next entry starts
  // fresh. Done in render (React's supported "adjust state on prop change"
  // pattern), not in an effect.
  if (state !== handledState) {
    setHandledState(state);
    if (state.status === "success") {
      setValues(EMPTY_INTERACTION_FORM);
      setClientErrors({});
      setDismissals({ source: state, fields: new Set() });
    }
  }

  // Move focus to the first field the server rejected.
  useEffect(() => {
    const firstField = FIELD_ORDER.find((field) => field in state.errors);
    if (!firstField) return;
    const element = formRef.current?.elements.namedItem(firstField);
    if (element instanceof HTMLElement) element.focus();
  }, [state]);

  const dismissed =
    dismissals.source === state
      ? dismissals.fields
      : new Set<InteractionField>();
  const serverErrors: InteractionErrors = { ...state.errors };
  for (const field of dismissed) delete serverErrors[field];
  const errors: InteractionErrors = { ...serverErrors, ...clientErrors };

  const hasServerFieldErrors = Object.keys(state.errors).length > 0;
  const showServerMessage =
    state.message.length > 0 &&
    (!hasServerFieldErrors || Object.keys(serverErrors).length > 0);

  function updateField(field: keyof InteractionFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setDismissals((current) => {
      const fields =
        current.source === state
          ? new Set(current.fields)
          : new Set<InteractionField>();
      fields.add(field);
      return { source: state, fields };
    });
    setClientErrors((current) => {
      if (!(field in current)) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const found = validateInteractionInput(
      normalizeInteractionInput({
        connectionId: 1, // placeholder: the real id is bound server-side
        interactionType: values.interactionType,
        occurredAt: values.occurredAt,
        notes: values.notes,
      }),
    );
    delete found.connectionId;
    if (Object.keys(found).length === 0) {
      setClientErrors({});
      return;
    }
    event.preventDefault();
    setClientErrors(found);
    const firstField = FIELD_ORDER.find((field) => field in found);
    if (firstField) {
      const element = formRef.current?.elements.namedItem(firstField);
      if (element instanceof HTMLElement) element.focus();
    }
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={handleSubmit}
      noValidate
      className="space-y-5"
    >
      <div>
        <label
          htmlFor="interactionType"
          className="block text-sm font-semibold"
        >
          How you connected
        </label>
        <select
          id="interactionType"
          name="interactionType"
          value={values.interactionType}
          onChange={(event) =>
            updateField("interactionType", event.target.value)
          }
          required
          aria-invalid={Boolean(errors.interactionType)}
          aria-describedby="interactionType-error"
          className="mt-2 min-h-12 w-full rounded-xl border border-[#cfc8bb] bg-white px-4 font-normal outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
        >
          <option value="">Choose how you connected</option>
          {INTERACTION_TYPES.map((type) => (
            <option key={type} value={type}>
              {INTERACTION_TYPE_LABEL[type]}
            </option>
          ))}
        </select>
        <FieldError id="interactionType-error" message={errors.interactionType} />
      </div>

      <div>
        <label htmlFor="occurredAt" className="block text-sm font-semibold">
          When{" "}
          <span className="font-normal text-[#69726c]">
            (optional — leave blank for now)
          </span>
        </label>
        <input
          id="occurredAt"
          name="occurredAt"
          type="datetime-local"
          value={values.occurredAt}
          onChange={(event) => updateField("occurredAt", event.target.value)}
          aria-invalid={Boolean(errors.occurredAt)}
          aria-describedby="occurredAt-help occurredAt-error"
          className="mt-2 min-h-12 w-full rounded-xl border border-[#cfc8bb] bg-white px-4 font-normal outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
        />
        <p id="occurredAt-help" className="mt-1 text-xs text-[#69726c]">
          You can back-date an interaction. A future time is not accepted.
        </p>
        <FieldError id="occurredAt-error" message={errors.occurredAt} />
      </div>

      <div>
        <label htmlFor="interactionNotes" className="block text-sm font-semibold">
          Private note{" "}
          <span className="font-normal text-[#69726c]">(optional)</span>
        </label>
        <textarea
          id="interactionNotes"
          name="notes"
          value={values.notes}
          onChange={(event) => updateField("notes", event.target.value)}
          rows={3}
          maxLength={INTERACTION_NOTES_MAX}
          aria-invalid={Boolean(errors.notes)}
          aria-describedby="interactionNotes-help interactionNotes-error"
          className="mt-2 w-full rounded-xl border border-[#cfc8bb] px-4 py-3 font-normal outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
        />
        <p id="interactionNotes-help" className="mt-1 text-xs text-[#69726c]">
          Only you can see this. {values.notes.length}/{INTERACTION_NOTES_MAX}{" "}
          characters
        </p>
        <FieldError
          id="interactionNotes-error"
          message={errors.notes}
        />
      </div>

      {showServerMessage && (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={`rounded-xl px-4 py-3 text-sm ${
            state.status === "error"
              ? "bg-[#fff0ed] text-[#8c3527]"
              : "bg-[#eef2e5] text-[#44512e]"
          }`}
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="min-h-12 rounded-full bg-[#263b2d] px-6 font-semibold text-white hover:bg-[#1d3024] disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Recording…" : "Record interaction"}
      </button>
    </form>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return (
    <p id={id} className="mt-1 min-h-5 text-sm text-[#9b3829]">
      {message ?? ""}
    </p>
  );
}
