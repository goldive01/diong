"use client";

import Link from "next/link";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  EMPTY_CONNECTION_FORM,
  type ConnectionFormValues,
  type CreateConnectionState,
} from "@/src/lib/connections/connection-form-state";
import {
  CONNECTION_NAME_MAX,
  CONNECTION_NOTES_MAX,
  CONNECTION_WHY_MAX,
  normalizeConnectionInput,
  validateConnectionInput,
  type ConnectionErrors,
  type ConnectionField,
} from "@/src/lib/connections/connection-validation";
import {
  CONNECTION_PURPOSE_LABEL,
  CONNECTION_TYPE_LABEL,
  CONTACT_RHYTHM_OPTIONS,
  describeContactRhythm,
} from "@/src/lib/connections/connection-labels";
import {
  CONNECTION_PURPOSES,
  CONNECTION_TYPES,
} from "@/src/lib/connections/connection-vocab";

const initialState: CreateConnectionState = { errors: {}, message: "" };

// Order used to focus the first field with an error.
const FIELD_ORDER: ConnectionField[] = [
  "name",
  "connectionType",
  "connectionPurpose",
  "whyItMatters",
  "preferredContactDays",
  "notes",
];

type ConnectionFormAction = (
  state: CreateConnectionState,
  formData: FormData,
) => Promise<CreateConnectionState>;

export function ConnectionForm({
  action,
  initialValues = EMPTY_CONNECTION_FORM,
  submitLabel = "Save connection",
  pendingLabel = "Saving…",
  cancelHref = "/connections",
}: {
  action: ConnectionFormAction;
  initialValues?: ConnectionFormValues;
  submitLabel?: string;
  pendingLabel?: string;
  cancelHref?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  // Keep an existing custom rhythm selectable when editing a connection whose
  // preferred_contact_days is not one of the preset choices.
  const rhythmOptions =
    initialValues.preferredContactDays !== "" &&
    !CONTACT_RHYTHM_OPTIONS.some(
      (option) => option.value === initialValues.preferredContactDays,
    )
      ? [
          ...CONTACT_RHYTHM_OPTIONS,
          {
            value: initialValues.preferredContactDays,
            label: describeContactRhythm(
              Number(initialValues.preferredContactDays),
            ),
          },
        ]
      : CONTACT_RHYTHM_OPTIONS;
  const [values, setValues] = useState<ConnectionFormValues>(initialValues);
  const [clientErrors, setClientErrors] = useState<ConnectionErrors>({});
  const [dismissals, setDismissals] = useState<{
    source: CreateConnectionState;
    fields: Set<ConnectionField>;
  }>({ source: initialState, fields: new Set() });
  const formRef = useRef<HTMLFormElement>(null);

  // Move focus to the first field the server rejected so its error is announced.
  useEffect(() => {
    const firstField = FIELD_ORDER.find((field) => field in state.errors);
    if (!firstField) return;
    const element = formRef.current?.elements.namedItem(firstField);
    if (element instanceof HTMLElement) element.focus();
  }, [state]);

  // Server errors that the user has not yet edited past. When the server
  // responds again (new `state` identity) every dismissal is dropped so fresh
  // errors show.
  const dismissed =
    dismissals.source === state ? dismissals.fields : new Set<ConnectionField>();
  const serverErrors: ConnectionErrors = { ...state.errors };
  for (const field of dismissed) delete serverErrors[field];
  const errors: ConnectionErrors = { ...serverErrors, ...clientErrors };

  const hasServerFieldErrors = Object.keys(state.errors).length > 0;
  const showServerMessage =
    state.message.length > 0 &&
    (!hasServerFieldErrors || Object.keys(serverErrors).length > 0);

  function updateField(field: keyof ConnectionFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setDismissals((current) => {
      const fields =
        current.source === state
          ? new Set(current.fields)
          : new Set<ConnectionField>();
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
    const found = validateConnectionInput(
      normalizeConnectionInput({ ...values }),
    );
    if (Object.keys(found).length === 0) {
      setClientErrors({});
      return; // let the form action run
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
      className="mt-8 space-y-6"
    >
      <div>
        <label htmlFor="name" className="block text-sm font-semibold">
          Name
        </label>
        <input
          id="name"
          name="name"
          value={values.name}
          onChange={(event) => updateField("name", event.target.value)}
          required
          maxLength={CONNECTION_NAME_MAX}
          autoComplete="off"
          aria-invalid={Boolean(errors.name)}
          aria-describedby="name-error"
          className="mt-2 min-h-12 w-full rounded-xl border border-[#cfc8bb] px-4 font-normal outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
        />
        <FieldError id="name-error" message={errors.name} />
      </div>

      <div>
        <label htmlFor="connectionType" className="block text-sm font-semibold">
          Connection type
        </label>
        <select
          id="connectionType"
          name="connectionType"
          value={values.connectionType}
          onChange={(event) =>
            updateField("connectionType", event.target.value)
          }
          required
          aria-invalid={Boolean(errors.connectionType)}
          aria-describedby="connectionType-error"
          className="mt-2 min-h-12 w-full rounded-xl border border-[#cfc8bb] bg-white px-4 font-normal outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
        >
          <option value="">Choose a type</option>
          {CONNECTION_TYPES.map((type) => (
            <option key={type} value={type}>
              {CONNECTION_TYPE_LABEL[type]}
            </option>
          ))}
        </select>
        <FieldError
          id="connectionType-error"
          message={errors.connectionType}
        />
      </div>

      <div>
        <label
          htmlFor="connectionPurpose"
          className="block text-sm font-semibold"
        >
          What this connection supports
        </label>
        <select
          id="connectionPurpose"
          name="connectionPurpose"
          value={values.connectionPurpose}
          onChange={(event) =>
            updateField("connectionPurpose", event.target.value)
          }
          required
          aria-invalid={Boolean(errors.connectionPurpose)}
          aria-describedby="connectionPurpose-error"
          className="mt-2 min-h-12 w-full rounded-xl border border-[#cfc8bb] bg-white px-4 font-normal outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
        >
          <option value="">Choose a focus</option>
          {CONNECTION_PURPOSES.map((purpose) => (
            <option key={purpose} value={purpose}>
              {CONNECTION_PURPOSE_LABEL[purpose]}
            </option>
          ))}
        </select>
        <FieldError
          id="connectionPurpose-error"
          message={errors.connectionPurpose}
        />
      </div>

      <div>
        <label htmlFor="whyItMatters" className="block text-sm font-semibold">
          Why this person matters{" "}
          <span className="font-normal text-[#69726c]">(optional)</span>
        </label>
        <textarea
          id="whyItMatters"
          name="whyItMatters"
          value={values.whyItMatters}
          onChange={(event) =>
            updateField("whyItMatters", event.target.value)
          }
          rows={3}
          maxLength={CONNECTION_WHY_MAX}
          aria-invalid={Boolean(errors.whyItMatters)}
          aria-describedby="whyItMatters-help whyItMatters-error"
          className="mt-2 w-full rounded-xl border border-[#cfc8bb] px-4 py-3 font-normal outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
        />
        <p id="whyItMatters-help" className="mt-1 text-xs text-[#69726c]">
          {values.whyItMatters.length}/{CONNECTION_WHY_MAX} characters
        </p>
        <FieldError
          id="whyItMatters-error"
          message={errors.whyItMatters}
        />
      </div>

      <div>
        <label
          htmlFor="preferredContactDays"
          className="block text-sm font-semibold"
        >
          Preferred contact rhythm{" "}
          <span className="font-normal text-[#69726c]">(optional)</span>
        </label>
        <select
          id="preferredContactDays"
          name="preferredContactDays"
          value={values.preferredContactDays}
          onChange={(event) =>
            updateField("preferredContactDays", event.target.value)
          }
          aria-invalid={Boolean(errors.preferredContactDays)}
          aria-describedby="preferredContactDays-help preferredContactDays-error"
          className="mt-2 min-h-12 w-full rounded-xl border border-[#cfc8bb] bg-white px-4 font-normal outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
        >
          {rhythmOptions.map((option) => (
            <option key={option.value || "none"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p
          id="preferredContactDays-help"
          className="mt-1 text-xs text-[#69726c]"
        >
          Diong uses this to gently flag when a connection is due for attention.
        </p>
        <FieldError
          id="preferredContactDays-error"
          message={errors.preferredContactDays}
        />
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-semibold">
          Notes <span className="font-normal text-[#69726c]">(optional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          value={values.notes}
          onChange={(event) => updateField("notes", event.target.value)}
          rows={4}
          maxLength={CONNECTION_NOTES_MAX}
          aria-invalid={Boolean(errors.notes)}
          aria-describedby="notes-help notes-error"
          className="mt-2 w-full rounded-xl border border-[#cfc8bb] px-4 py-3 font-normal outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
        />
        <p id="notes-help" className="mt-1 text-xs text-[#69726c]">
          Only you can see your notes. {values.notes.length}/
          {CONNECTION_NOTES_MAX} characters
        </p>
        <FieldError id="notes-error" message={errors.notes} />
      </div>

      {showServerMessage && (
        <p
          role="alert"
          className="rounded-xl bg-[#fff0ed] px-4 py-3 text-sm text-[#8c3527]"
        >
          {state.message}
        </p>
      )}

      <div className="flex items-center gap-3 border-t border-[#ece7de] pt-6">
        <button
          type="submit"
          disabled={pending}
          className="min-h-12 rounded-full bg-[#263b2d] px-6 font-semibold text-white hover:bg-[#1d3024] disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? pendingLabel : submitLabel}
        </button>
        <Link
          href={cancelHref}
          className="min-h-12 rounded-full px-4 py-3 font-semibold text-[#4d574f] hover:underline"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  // Referenced by the input's aria-describedby, so the message is announced when
  // focus moves to the field (the form focuses the first invalid field on both
  // client- and server-side validation failure).
  return (
    <p id={id} className="mt-1 min-h-5 text-sm text-[#9b3829]">
      {message ?? ""}
    </p>
  );
}
