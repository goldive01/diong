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
  EMPTY_COMMUNITY_FORM,
  type CommunityFormValues,
  type CreateCommunityState,
} from "@/src/lib/communities/community-form-state";
import {
  COMMUNITY_DESCRIPTION_MAX,
  COMMUNITY_NAME_MAX,
  COMMUNITY_RULES_MAX,
  COMMUNITY_SLUG_MAX,
  normalizeCommunitySlug,
  validateCommunityInput,
  type CommunityErrors,
  type CommunityField,
} from "@/src/lib/communities/community-validation";

const initialState: CreateCommunityState = {
  errors: {},
  message: "",
  values: EMPTY_COMMUNITY_FORM,
};

const FIELD_ORDER: CommunityField[] = ["name", "slug", "description", "rules"];

type CommunityFormAction = (
  state: CreateCommunityState,
  formData: FormData,
) => Promise<CreateCommunityState>;

// Create-community form. Controlled state, both client- and server-side
// validation, values preserved on error, stale errors clear once a field is
// edited past them — same pattern as ConnectionForm.
export function CommunityForm({ action }: { action: CommunityFormAction }) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [values, setValues] = useState<CommunityFormValues>(EMPTY_COMMUNITY_FORM);
  const [clientErrors, setClientErrors] = useState<CommunityErrors>({});
  const [dismissals, setDismissals] = useState<{
    source: CreateCommunityState;
    fields: Set<CommunityField>;
  }>({ source: initialState, fields: new Set() });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const firstField = FIELD_ORDER.find((field) => field in state.errors);
    if (!firstField) return;
    const element = formRef.current?.elements.namedItem(firstField);
    if (element instanceof HTMLElement) element.focus();
  }, [state]);

  const dismissed =
    dismissals.source === state ? dismissals.fields : new Set<CommunityField>();
  const serverErrors: CommunityErrors = { ...state.errors };
  for (const field of dismissed) delete serverErrors[field];
  const errors: CommunityErrors = { ...serverErrors, ...clientErrors };

  const hasServerFieldErrors = Object.keys(state.errors).length > 0;
  const showServerMessage =
    state.message.length > 0 &&
    (!hasServerFieldErrors || Object.keys(serverErrors).length > 0);

  function updateField(field: keyof CommunityFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setDismissals((current) => {
      const fields =
        current.source === state
          ? new Set(current.fields)
          : new Set<CommunityField>();
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
    const found = validateCommunityInput({ ...values });
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
          maxLength={COMMUNITY_NAME_MAX}
          autoComplete="off"
          aria-invalid={Boolean(errors.name)}
          aria-describedby="name-error"
          className="mt-2 min-h-12 w-full rounded-xl border border-[#cfc8bb] px-4 font-normal outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
        />
        <FieldError id="name-error" message={errors.name} />
      </div>

      <div>
        <label htmlFor="slug" className="block text-sm font-semibold">
          Slug
        </label>
        <input
          id="slug"
          name="slug"
          value={values.slug}
          onChange={(event) =>
            updateField("slug", normalizeCommunitySlug(event.target.value))
          }
          required
          maxLength={COMMUNITY_SLUG_MAX}
          autoComplete="off"
          aria-invalid={Boolean(errors.slug)}
          aria-describedby="slug-help slug-error"
          className="mt-2 min-h-12 w-full rounded-xl border border-[#cfc8bb] px-4 font-mono text-sm outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
        />
        <p id="slug-help" className="mt-1 text-xs text-[#69726c]">
          diong.app/communities/{values.slug || "your-slug"}
        </p>
        <FieldError id="slug-error" message={errors.slug} />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-semibold">
          Description{" "}
          <span className="font-normal text-[#69726c]">(optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          value={values.description}
          onChange={(event) => updateField("description", event.target.value)}
          rows={3}
          maxLength={COMMUNITY_DESCRIPTION_MAX}
          aria-invalid={Boolean(errors.description)}
          aria-describedby="description-help description-error"
          className="mt-2 w-full rounded-xl border border-[#cfc8bb] px-4 py-3 font-normal outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
        />
        <p id="description-help" className="mt-1 text-xs text-[#69726c]">
          {values.description.length}/{COMMUNITY_DESCRIPTION_MAX} characters
        </p>
        <FieldError id="description-error" message={errors.description} />
      </div>

      <div>
        <label htmlFor="rules" className="block text-sm font-semibold">
          Rules <span className="font-normal text-[#69726c]">(optional)</span>
        </label>
        <textarea
          id="rules"
          name="rules"
          value={values.rules}
          onChange={(event) => updateField("rules", event.target.value)}
          rows={5}
          maxLength={COMMUNITY_RULES_MAX}
          aria-invalid={Boolean(errors.rules)}
          aria-describedby="rules-help rules-error"
          className="mt-2 w-full rounded-xl border border-[#cfc8bb] px-4 py-3 font-normal outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20"
        />
        <p id="rules-help" className="mt-1 text-xs text-[#69726c]">
          {values.rules.length}/{COMMUNITY_RULES_MAX} characters
        </p>
        <FieldError id="rules-error" message={errors.rules} />
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
          {pending ? "Creating…" : "Create community"}
        </button>
        <Link
          href="/communities"
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
