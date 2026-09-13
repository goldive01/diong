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
  EMPTY_HABIT_FORM,
  type HabitFormState,
  type HabitFormValues,
} from "@/src/lib/habits/habit-form-state";
import {
  HABIT_DESCRIPTION_MAX,
  HABIT_NAME_MAX,
  TARGET_PER_PERIOD_MAX,
  TARGET_PER_PERIOD_MIN,
  normalizeHabitInput,
  validateHabitInput,
  type HabitErrors,
  type HabitField,
} from "@/src/lib/habits/habit-validation";
import { HABIT_FREQUENCY_LABEL } from "@/src/lib/habits/habit-labels";
import { HABIT_FREQUENCIES } from "@/src/lib/habits/habit-vocab";

const initialState: HabitFormState = { errors: {}, message: "", values: EMPTY_HABIT_FORM };

const FIELD_ORDER: HabitField[] = ["name", "description", "frequency", "targetPerPeriod"];

type HabitFormAction = (
  state: HabitFormState,
  formData: FormData,
) => Promise<HabitFormState>;

export function HabitForm({
  action,
  initialValues = EMPTY_HABIT_FORM,
  submitLabel = "Create habit",
  pendingLabel = "Saving…",
  cancelHref = "/habits",
}: {
  action: HabitFormAction;
  initialValues?: HabitFormValues;
  submitLabel?: string;
  pendingLabel?: string;
  cancelHref?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [values, setValues] = useState<HabitFormValues>(initialValues);
  const [clientErrors, setClientErrors] = useState<HabitErrors>({});
  const [dismissals, setDismissals] = useState<{
    source: HabitFormState;
    fields: Set<HabitField>;
  }>({ source: initialState, fields: new Set() });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const firstField = FIELD_ORDER.find((field) => field in state.errors);
    if (!firstField) return;
    const element = formRef.current?.elements.namedItem(firstField);
    if (element instanceof HTMLElement) element.focus();
  }, [state]);

  const dismissed =
    dismissals.source === state ? dismissals.fields : new Set<HabitField>();
  const serverErrors: HabitErrors = { ...state.errors };
  for (const field of dismissed) delete serverErrors[field];
  const errors: HabitErrors = { ...serverErrors, ...clientErrors };

  const hasServerFieldErrors = Object.keys(state.errors).length > 0;
  const showServerMessage =
    state.message.length > 0 &&
    (!hasServerFieldErrors || Object.keys(serverErrors).length > 0);

  function updateField(field: keyof HabitFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setDismissals((current) => {
      const fields =
        current.source === state ? new Set(current.fields) : new Set<HabitField>();
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
    const found = validateHabitInput(normalizeHabitInput({ ...values }));
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
        <label htmlFor="name" className="block text-sm font-semibold">
          Name
        </label>
        <input
          id="name"
          name="name"
          value={values.name}
          onChange={(event) => updateField("name", event.target.value)}
          required
          maxLength={HABIT_NAME_MAX}
          autoComplete="off"
          aria-invalid={Boolean(errors.name)}
          aria-describedby="name-error"
          className="mt-2 min-h-12 w-full rounded-xl border border-[#cfc8bb] px-4 font-normal outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
        />
        <FieldError id="name-error" message={errors.name} />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-semibold">
          Description <span className="font-normal text-[#69726c]">(optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          value={values.description}
          onChange={(event) => updateField("description", event.target.value)}
          rows={3}
          maxLength={HABIT_DESCRIPTION_MAX}
          aria-invalid={Boolean(errors.description)}
          aria-describedby="description-help description-error"
          className="mt-2 w-full rounded-xl border border-[#cfc8bb] px-4 py-3 font-normal outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
        />
        <p id="description-help" className="mt-1 text-xs text-[#69726c]">
          {values.description.length}/{HABIT_DESCRIPTION_MAX} characters
        </p>
        <FieldError id="description-error" message={errors.description} />
      </div>

      <div>
        <label htmlFor="frequency" className="block text-sm font-semibold">
          Frequency
        </label>
        <select
          id="frequency"
          name="frequency"
          value={values.frequency}
          onChange={(event) => updateField("frequency", event.target.value)}
          required
          aria-invalid={Boolean(errors.frequency)}
          aria-describedby="frequency-error"
          className="mt-2 min-h-12 w-full rounded-xl border border-[#cfc8bb] bg-white px-4 font-normal outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
        >
          {HABIT_FREQUENCIES.map((frequency) => (
            <option key={frequency} value={frequency}>
              {HABIT_FREQUENCY_LABEL[frequency]}
            </option>
          ))}
        </select>
        <FieldError id="frequency-error" message={errors.frequency} />
      </div>

      <div>
        <label htmlFor="targetPerPeriod" className="block text-sm font-semibold">
          Target per {values.frequency === "weekly" ? "week" : "day"}
        </label>
        <input
          id="targetPerPeriod"
          name="targetPerPeriod"
          type="number"
          min={TARGET_PER_PERIOD_MIN}
          max={TARGET_PER_PERIOD_MAX}
          step={1}
          value={values.targetPerPeriod}
          onChange={(event) => updateField("targetPerPeriod", event.target.value)}
          required
          aria-invalid={Boolean(errors.targetPerPeriod)}
          aria-describedby="targetPerPeriod-error"
          className="mt-2 min-h-12 w-32 rounded-xl border border-[#cfc8bb] px-4 font-normal outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
        />
        <FieldError id="targetPerPeriod-error" message={errors.targetPerPeriod} />
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
