"use client";

import Link from "next/link";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type { GoalOption } from "@/src/lib/goals/goals-data";
import type { HabitOption } from "@/src/lib/habits/habits-data";
import type { PrimeAssignmentOption } from "@/src/lib/journal/journal-data";
import type {
  JournalFormState,
  JournalFormValues,
} from "@/src/lib/journal/journal-form-state";
import {
  JOURNAL_BODY_MAX,
  JOURNAL_TITLE_MAX,
  normalizeJournalInput,
  validateJournalInput,
  type JournalErrors,
  type JournalField,
} from "@/src/lib/journal/journal-validation";
import { JOURNAL_MOOD_LABEL } from "@/src/lib/journal/journal-labels";
import { JOURNAL_MOODS } from "@/src/lib/journal/journal-vocab";

const FIELD_ORDER: JournalField[] = [
  "title",
  "entryDate",
  "mood",
  "body",
  "goalId",
  "habitId",
  "primeAssignmentId",
];

type JournalFormAction = (
  state: JournalFormState,
  formData: FormData,
) => Promise<JournalFormState>;

export function JournalForm({
  action,
  initialValues,
  goalOptions,
  habitOptions,
  primeOptions,
  submitLabel = "Save entry",
  pendingLabel = "Saving…",
  cancelHref = "/journal",
}: {
  action: JournalFormAction;
  initialValues: JournalFormValues;
  goalOptions: GoalOption[];
  habitOptions: HabitOption[];
  primeOptions: PrimeAssignmentOption[];
  submitLabel?: string;
  pendingLabel?: string;
  cancelHref?: string;
}) {
  const initialState: JournalFormState = {
    errors: {},
    message: "",
    values: initialValues,
  };
  const [state, formAction, pending] = useActionState(action, initialState);
  const [values, setValues] = useState<JournalFormValues>(initialValues);
  const [clientErrors, setClientErrors] = useState<JournalErrors>({});
  const [dismissals, setDismissals] = useState<{
    source: JournalFormState;
    fields: Set<JournalField>;
  }>({ source: initialState, fields: new Set() });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const firstField = FIELD_ORDER.find((field) => field in state.errors);
    if (!firstField) return;
    const element = formRef.current?.elements.namedItem(firstField);
    if (element instanceof HTMLElement) element.focus();
  }, [state]);

  const dismissed =
    dismissals.source === state ? dismissals.fields : new Set<JournalField>();
  const serverErrors: JournalErrors = { ...state.errors };
  for (const field of dismissed) delete serverErrors[field];
  const errors: JournalErrors = { ...serverErrors, ...clientErrors };

  const hasServerFieldErrors = Object.keys(state.errors).length > 0;
  const showServerMessage =
    state.message.length > 0 &&
    (!hasServerFieldErrors || Object.keys(serverErrors).length > 0);

  function updateField(field: keyof JournalFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setDismissals((current) => {
      const fields =
        current.source === state ? new Set(current.fields) : new Set<JournalField>();
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
    const found = validateJournalInput(normalizeJournalInput({ ...values }));
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
      className="mt-8 space-y-6"
    >
      <div>
        <label htmlFor="title" className="block text-sm font-semibold">
          Title <span className="font-normal text-[#69726c]">(optional)</span>
        </label>
        <input
          id="title"
          name="title"
          value={values.title}
          onChange={(event) => updateField("title", event.target.value)}
          maxLength={JOURNAL_TITLE_MAX}
          autoComplete="off"
          aria-invalid={Boolean(errors.title)}
          aria-describedby="title-error"
          className="mt-2 min-h-12 w-full rounded-xl border border-[#cfc8bb] px-4 font-normal outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
        />
        <FieldError id="title-error" message={errors.title} />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="entryDate" className="block text-sm font-semibold">
            Date
          </label>
          <input
            id="entryDate"
            name="entryDate"
            type="date"
            value={values.entryDate}
            onChange={(event) => updateField("entryDate", event.target.value)}
            required
            aria-invalid={Boolean(errors.entryDate)}
            aria-describedby="entryDate-error"
            className="mt-2 min-h-12 w-full rounded-xl border border-[#cfc8bb] px-4 font-normal outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
          />
          <FieldError id="entryDate-error" message={errors.entryDate} />
        </div>

        <div>
          <label htmlFor="mood" className="block text-sm font-semibold">
            Mood <span className="font-normal text-[#69726c]">(optional)</span>
          </label>
          <select
            id="mood"
            name="mood"
            value={values.mood}
            onChange={(event) => updateField("mood", event.target.value)}
            aria-invalid={Boolean(errors.mood)}
            aria-describedby="mood-error"
            className="mt-2 min-h-12 w-full rounded-xl border border-[#cfc8bb] bg-white px-4 font-normal outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
          >
            <option value="">Not noted</option>
            {JOURNAL_MOODS.map((mood) => (
              <option key={mood} value={mood}>
                {JOURNAL_MOOD_LABEL[mood]}
              </option>
            ))}
          </select>
          <FieldError id="mood-error" message={errors.mood} />
        </div>
      </div>

      <div>
        <label htmlFor="body" className="block text-sm font-semibold">
          What are you noticing?
        </label>
        <textarea
          id="body"
          name="body"
          value={values.body}
          onChange={(event) => updateField("body", event.target.value)}
          rows={8}
          required
          maxLength={JOURNAL_BODY_MAX}
          aria-invalid={Boolean(errors.body)}
          aria-describedby="body-help body-error"
          className="mt-2 w-full rounded-xl border border-[#cfc8bb] px-4 py-3 font-normal leading-7 outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
        />
        <p id="body-help" className="mt-1 text-xs text-[#69726c]">
          {values.body.length.toLocaleString()}/{JOURNAL_BODY_MAX.toLocaleString()} characters
        </p>
        <FieldError id="body-error" message={errors.body} />
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <div>
          <label htmlFor="goalId" className="block text-sm font-semibold">
            Link a goal <span className="font-normal text-[#69726c]">(optional)</span>
          </label>
          <select
            id="goalId"
            name="goalId"
            value={values.goalId}
            onChange={(event) => updateField("goalId", event.target.value)}
            aria-invalid={Boolean(errors.goalId)}
            aria-describedby="goalId-error"
            className="mt-2 min-h-12 w-full rounded-xl border border-[#cfc8bb] bg-white px-3 text-sm font-normal outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
          >
            <option value="">None</option>
            {goalOptions.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.title}
              </option>
            ))}
          </select>
          <FieldError id="goalId-error" message={errors.goalId} />
        </div>

        <div>
          <label htmlFor="habitId" className="block text-sm font-semibold">
            Link a habit <span className="font-normal text-[#69726c]">(optional)</span>
          </label>
          <select
            id="habitId"
            name="habitId"
            value={values.habitId}
            onChange={(event) => updateField("habitId", event.target.value)}
            aria-invalid={Boolean(errors.habitId)}
            aria-describedby="habitId-error"
            className="mt-2 min-h-12 w-full rounded-xl border border-[#cfc8bb] bg-white px-3 text-sm font-normal outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
          >
            <option value="">None</option>
            {habitOptions.map((habit) => (
              <option key={habit.id} value={habit.id}>
                {habit.name}
              </option>
            ))}
          </select>
          <FieldError id="habitId-error" message={errors.habitId} />
        </div>

        <div>
          <label htmlFor="primeAssignmentId" className="block text-sm font-semibold">
            Link a Daily Prime <span className="font-normal text-[#69726c]">(optional)</span>
          </label>
          <select
            id="primeAssignmentId"
            name="primeAssignmentId"
            value={values.primeAssignmentId}
            onChange={(event) => updateField("primeAssignmentId", event.target.value)}
            aria-invalid={Boolean(errors.primeAssignmentId)}
            aria-describedby="primeAssignmentId-error"
            className="mt-2 min-h-12 w-full rounded-xl border border-[#cfc8bb] bg-white px-3 text-sm font-normal outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
          >
            <option value="">None</option>
            {primeOptions.map((prime) => (
              <option key={prime.id} value={prime.id}>
                {prime.label}
              </option>
            ))}
          </select>
          <FieldError id="primeAssignmentId-error" message={errors.primeAssignmentId} />
        </div>
      </div>

      {showServerMessage && (
        <p role="alert" className="rounded-xl bg-[#fff0ed] px-4 py-3 text-sm text-[#8c3527]">
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
  return (
    <p id={id} className="mt-1 min-h-5 text-sm text-[#9b3829]">
      {message ?? ""}
    </p>
  );
}
