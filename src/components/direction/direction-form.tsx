"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  EMPTY_DIRECTION_FORM,
  type DirectionFormState,
  type DirectionFormValues,
} from "@/src/lib/direction/direction-form-state";
import {
  DESIRED_IDENTITY_MAX,
  INTENTION_MAX,
  PRIMARY_ACTION_MAX,
  WHY_IT_MATTERS_MAX,
  normalizeDirectionInput,
  validateDirectionInput,
  type DirectionErrors,
  type DirectionField,
} from "@/src/lib/direction/direction-validation";

const initialState: DirectionFormState = {
  errors: {},
  message: "",
  values: EMPTY_DIRECTION_FORM,
};

const FIELD_ORDER: DirectionField[] = [
  "primaryAction",
  "intention",
  "desiredIdentity",
  "whyItMatters",
];

type DirectionFormAction = (
  state: DirectionFormState,
  formData: FormData,
) => Promise<DirectionFormState>;

export function DirectionForm({
  action,
  initialValues = EMPTY_DIRECTION_FORM,
  submitLabel = "Save today's direction",
  pendingLabel = "Saving…",
  goalOptions,
  habitOptions,
}: {
  action: DirectionFormAction;
  initialValues?: DirectionFormValues;
  submitLabel?: string;
  pendingLabel?: string;
  goalOptions: { id: number; title: string }[];
  habitOptions: { id: number; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [values, setValues] = useState<DirectionFormValues>(initialValues);
  const [clientErrors, setClientErrors] = useState<DirectionErrors>({});
  const [dismissals, setDismissals] = useState<{
    source: DirectionFormState;
    fields: Set<DirectionField>;
  }>({ source: initialState, fields: new Set() });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const firstField = FIELD_ORDER.find((field) => field in state.errors);
    if (!firstField) return;
    const element = formRef.current?.elements.namedItem(firstField);
    if (element instanceof HTMLElement) element.focus();
  }, [state]);

  const dismissed =
    dismissals.source === state ? dismissals.fields : new Set<DirectionField>();
  const serverErrors: DirectionErrors = { ...state.errors };
  for (const field of dismissed) delete serverErrors[field];
  const errors: DirectionErrors = { ...serverErrors, ...clientErrors };

  const hasServerFieldErrors = Object.keys(state.errors).length > 0;
  const showServerMessage =
    state.message.length > 0 &&
    (!hasServerFieldErrors || Object.keys(serverErrors).length > 0);

  function updateField(field: keyof DirectionFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setDismissals((current) => {
      const fields =
        current.source === state ? new Set(current.fields) : new Set<DirectionField>();
      fields.add(field as DirectionField);
      return { source: state, fields };
    });
    setClientErrors((current) => {
      if (!(field in current)) return current;
      const next = { ...current };
      delete next[field as DirectionField];
      return next;
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const found = validateDirectionInput(
      normalizeDirectionInput({
        intention: values.intention,
        desiredIdentity: values.desiredIdentity,
        primaryAction: values.primaryAction,
        whyItMatters: values.whyItMatters,
      }),
    );
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
      className="space-y-6"
    >
      <div>
        <label htmlFor="primaryAction" className="block text-sm font-semibold">
          What is the one meaningful action?
        </label>
        <textarea
          id="primaryAction"
          name="primaryAction"
          value={values.primaryAction}
          onChange={(event) => updateField("primaryAction", event.target.value)}
          required
          rows={2}
          maxLength={PRIMARY_ACTION_MAX}
          aria-invalid={Boolean(errors.primaryAction)}
          aria-describedby="primaryAction-help primaryAction-error"
          className="mt-2 w-full rounded-xl border border-[#cfc8bb] px-4 py-3 font-normal outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
        />
        <p id="primaryAction-help" className="mt-1 text-xs text-[#69726c]">
          {values.primaryAction.length}/{PRIMARY_ACTION_MAX} characters
        </p>
        <FieldError id="primaryAction-error" message={errors.primaryAction} />
      </div>

      <div>
        <label htmlFor="intention" className="block text-sm font-semibold">
          What matters most today?{" "}
          <span className="font-normal text-[#69726c]">(optional)</span>
        </label>
        <textarea
          id="intention"
          name="intention"
          value={values.intention}
          onChange={(event) => updateField("intention", event.target.value)}
          rows={2}
          maxLength={INTENTION_MAX}
          aria-invalid={Boolean(errors.intention)}
          aria-describedby="intention-help intention-error"
          className="mt-2 w-full rounded-xl border border-[#cfc8bb] px-4 py-3 font-normal outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
        />
        <p id="intention-help" className="mt-1 text-xs text-[#69726c]">
          {values.intention.length}/{INTENTION_MAX} characters
        </p>
        <FieldError id="intention-error" message={errors.intention} />
      </div>

      <div>
        <label htmlFor="desiredIdentity" className="block text-sm font-semibold">
          Who are you choosing to be today?{" "}
          <span className="font-normal text-[#69726c]">(optional)</span>
        </label>
        <input
          id="desiredIdentity"
          name="desiredIdentity"
          value={values.desiredIdentity}
          onChange={(event) => updateField("desiredIdentity", event.target.value)}
          maxLength={DESIRED_IDENTITY_MAX}
          autoComplete="off"
          aria-invalid={Boolean(errors.desiredIdentity)}
          aria-describedby="desiredIdentity-error"
          className="mt-2 min-h-12 w-full rounded-xl border border-[#cfc8bb] px-4 font-normal outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
        />
        <FieldError id="desiredIdentity-error" message={errors.desiredIdentity} />
      </div>

      <div>
        <label htmlFor="whyItMatters" className="block text-sm font-semibold">
          Why does it matter?{" "}
          <span className="font-normal text-[#69726c]">(optional)</span>
        </label>
        <textarea
          id="whyItMatters"
          name="whyItMatters"
          value={values.whyItMatters}
          onChange={(event) => updateField("whyItMatters", event.target.value)}
          rows={3}
          maxLength={WHY_IT_MATTERS_MAX}
          aria-invalid={Boolean(errors.whyItMatters)}
          aria-describedby="whyItMatters-help whyItMatters-error"
          className="mt-2 w-full rounded-xl border border-[#cfc8bb] px-4 py-3 font-normal outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
        />
        <p id="whyItMatters-help" className="mt-1 text-xs text-[#69726c]">
          {values.whyItMatters.length}/{WHY_IT_MATTERS_MAX} characters
        </p>
        <FieldError id="whyItMatters-error" message={errors.whyItMatters} />
      </div>

      {(goalOptions.length > 0 || habitOptions.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {goalOptions.length > 0 && (
            <div>
              <label htmlFor="goalId" className="block text-sm font-semibold">
                Link to a goal <span className="font-normal text-[#69726c]">(optional)</span>
              </label>
              <select
                id="goalId"
                name="goalId"
                value={values.goalId}
                onChange={(event) => updateField("goalId", event.target.value)}
                className="mt-2 min-h-12 w-full rounded-xl border border-[#cfc8bb] bg-white px-4 font-normal outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
              >
                <option value="">None</option>
                {goalOptions.map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {habitOptions.length > 0 && (
            <div>
              <label htmlFor="habitId" className="block text-sm font-semibold">
                Link to a habit <span className="font-normal text-[#69726c]">(optional)</span>
              </label>
              <select
                id="habitId"
                name="habitId"
                value={values.habitId}
                onChange={(event) => updateField("habitId", event.target.value)}
                className="mt-2 min-h-12 w-full rounded-xl border border-[#cfc8bb] bg-white px-4 font-normal outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
              >
                <option value="">None</option>
                {habitOptions.map((habit) => (
                  <option key={habit.id} value={habit.id}>
                    {habit.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

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
