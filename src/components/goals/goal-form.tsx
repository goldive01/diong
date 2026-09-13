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
  EMPTY_GOAL_FORM,
  type GoalFormState,
  type GoalFormValues,
} from "@/src/lib/goals/goal-form-state";
import {
  GOAL_CATEGORY_MAX,
  GOAL_DESCRIPTION_MAX,
  GOAL_TITLE_MAX,
  normalizeGoalInput,
  validateGoalInput,
  type GoalErrors,
  type GoalField,
} from "@/src/lib/goals/goal-validation";

const initialState: GoalFormState = {
  errors: {},
  message: "",
  values: EMPTY_GOAL_FORM,
};

const FIELD_ORDER: GoalField[] = ["title", "description", "category", "targetDate"];

type GoalFormAction = (
  state: GoalFormState,
  formData: FormData,
) => Promise<GoalFormState>;

export function GoalForm({
  action,
  initialValues = EMPTY_GOAL_FORM,
  submitLabel = "Create goal",
  pendingLabel = "Saving…",
  cancelHref = "/goals",
}: {
  action: GoalFormAction;
  initialValues?: GoalFormValues;
  submitLabel?: string;
  pendingLabel?: string;
  cancelHref?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [values, setValues] = useState<GoalFormValues>(initialValues);
  const [clientErrors, setClientErrors] = useState<GoalErrors>({});
  const [dismissals, setDismissals] = useState<{
    source: GoalFormState;
    fields: Set<GoalField>;
  }>({ source: initialState, fields: new Set() });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const firstField = FIELD_ORDER.find((field) => field in state.errors);
    if (!firstField) return;
    const element = formRef.current?.elements.namedItem(firstField);
    if (element instanceof HTMLElement) element.focus();
  }, [state]);

  const dismissed =
    dismissals.source === state ? dismissals.fields : new Set<GoalField>();
  const serverErrors: GoalErrors = { ...state.errors };
  for (const field of dismissed) delete serverErrors[field];
  const errors: GoalErrors = { ...serverErrors, ...clientErrors };

  const hasServerFieldErrors = Object.keys(state.errors).length > 0;
  const showServerMessage =
    state.message.length > 0 &&
    (!hasServerFieldErrors || Object.keys(serverErrors).length > 0);

  function updateField(field: keyof GoalFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setDismissals((current) => {
      const fields =
        current.source === state ? new Set(current.fields) : new Set<GoalField>();
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
    const found = validateGoalInput(normalizeGoalInput({ ...values }));
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
          Title
        </label>
        <input
          id="title"
          name="title"
          value={values.title}
          onChange={(event) => updateField("title", event.target.value)}
          required
          maxLength={GOAL_TITLE_MAX}
          autoComplete="off"
          aria-invalid={Boolean(errors.title)}
          aria-describedby="title-error"
          className="mt-2 min-h-12 w-full rounded-xl border border-[#cfc8bb] px-4 font-normal outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
        />
        <FieldError id="title-error" message={errors.title} />
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
          rows={4}
          maxLength={GOAL_DESCRIPTION_MAX}
          aria-invalid={Boolean(errors.description)}
          aria-describedby="description-help description-error"
          className="mt-2 w-full rounded-xl border border-[#cfc8bb] px-4 py-3 font-normal outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
        />
        <p id="description-help" className="mt-1 text-xs text-[#69726c]">
          {values.description.length}/{GOAL_DESCRIPTION_MAX} characters
        </p>
        <FieldError id="description-error" message={errors.description} />
      </div>

      <div>
        <label htmlFor="category" className="block text-sm font-semibold">
          Category <span className="font-normal text-[#69726c]">(optional)</span>
        </label>
        <input
          id="category"
          name="category"
          value={values.category}
          onChange={(event) => updateField("category", event.target.value)}
          maxLength={GOAL_CATEGORY_MAX}
          autoComplete="off"
          aria-invalid={Boolean(errors.category)}
          aria-describedby="category-error"
          className="mt-2 min-h-12 w-full rounded-xl border border-[#cfc8bb] px-4 font-normal outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
        />
        <FieldError id="category-error" message={errors.category} />
      </div>

      <div>
        <label htmlFor="targetDate" className="block text-sm font-semibold">
          Target date <span className="font-normal text-[#69726c]">(optional)</span>
        </label>
        <input
          id="targetDate"
          name="targetDate"
          type="date"
          value={values.targetDate}
          onChange={(event) => updateField("targetDate", event.target.value)}
          aria-invalid={Boolean(errors.targetDate)}
          aria-describedby="targetDate-error"
          className="mt-2 min-h-12 w-full rounded-xl border border-[#cfc8bb] px-4 font-normal outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
        />
        <FieldError id="targetDate-error" message={errors.targetDate} />
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
