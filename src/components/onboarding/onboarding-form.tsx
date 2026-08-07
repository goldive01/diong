"use client";

import { useActionState, useRef, useState, useTransition, type FormEvent } from "react";
import {
  checkUsernameAvailability,
  completeOnboarding,
  type OnboardingState,
} from "@/app/onboarding/actions";
import {
  normalizeUsername,
  validateProfile,
  type ProfileErrors,
  type ProfileField,
} from "@/src/lib/profile-validation";
import type { Interest, OnboardingFormData } from "@/src/types/database";

interface OnboardingFormProps {
  interests: Interest[];
  initialValues: OnboardingFormData;
}

const initialState: OnboardingState = { message: "", errors: {} };

export function OnboardingForm({ interests, initialValues }: OnboardingFormProps) {
  const [stage, setStage] = useState(1);
  const [values, setValues] = useState(initialValues);
  const [state, formAction, saving] = useActionState(completeOnboarding, initialState);
  const [availability, setAvailability] = useState("");
  const [clientErrors, setClientErrors] = useState<ProfileErrors>({});
  const [serverErrorDismissals, setServerErrorDismissals] = useState<{
    source: OnboardingState;
    fields: Set<ProfileField>;
  }>({ source: initialState, fields: new Set() });
  const [checking, startChecking] = useTransition();
  const usernameCheckId = useRef(0);

  const selectedInterests = interests.filter((interest) => values.interestIds.includes(interest.id));
  const visibleServerErrors = { ...state.errors };
  const dismissedFields = serverErrorDismissals.source === state
    ? serverErrorDismissals.fields
    : new Set<ProfileField>();
  for (const field of dismissedFields) delete visibleServerErrors[field];
  const errors = { ...visibleServerErrors, ...clientErrors };
  const hasServerFieldErrors = Object.keys(state.errors).length > 0;
  const showServerMessage = state.message
    && (!hasServerFieldErrors || Object.keys(visibleServerErrors).length > 0);

  function clearFieldErrors(field: ProfileField) {
    setServerErrorDismissals((current) => {
      const fields = current.source === state ? new Set(current.fields) : new Set<ProfileField>();
      fields.add(field);
      return { source: state, fields };
    });
    setClientErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function updateProfileValue(field: "username" | "displayName" | "bio", value: string) {
    clearFieldErrors(field);
    setValues((current) => ({ ...current, [field]: value }));
  }

  function toggleInterest(id: number) {
    clearFieldErrors("interestIds");
    setValues((current) => {
      const selected = current.interestIds.includes(id);
      if (!selected && current.interestIds.length >= 5) return current;
      return {
        ...current,
        interestIds: selected
          ? current.interestIds.filter((interestId) => interestId !== id)
          : [...current.interestIds, id],
      };
    });
  }

  function checkUsername() {
    const normalized = normalizeUsername(values.username);
    const checkId = usernameCheckId.current + 1;
    usernameCheckId.current = checkId;
    if (normalized !== values.username) updateProfileValue("username", normalized);
    startChecking(async () => {
      const result = await checkUsernameAvailability(normalized);
      if (usernameCheckId.current !== checkId) return;
      if (result.available) clearFieldErrors("username");
      setAvailability(result.message);
    });
  }

  function continueToNextStage() {
    if (stage === 1) {
      const profileErrors = validateProfile(values);
      if (Object.keys(profileErrors).length > 0) {
        setClientErrors(profileErrors);
        return;
      }
    }

    if (stage === 2 && (values.interestIds.length < 1 || values.interestIds.length > 5)) {
      setClientErrors({ interestIds: "Choose between 1 and 5 interests." });
      return;
    }

    setClientErrors({});
    setStage((current) => Math.min(3, current + 1));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (stage === 3) return;
    event.preventDefault();
    continueToNextStage();
  }

  return (
    <main className="min-h-screen bg-[#f7f4ee] px-5 py-8 text-[#1d2420] sm:py-12">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <p className="font-bold tracking-tight">Diong</p>
          <p className="mt-8 text-sm font-semibold uppercase tracking-[0.18em] text-[#6f7b4f]">Step {stage} of 3</p>
          <div className="mt-3 grid grid-cols-3 gap-2" aria-hidden="true">
            {[1, 2, 3].map((item) => <span key={item} className={`h-1.5 rounded-full ${item <= stage ? "bg-[#6f7b4f]" : "bg-[#d8d1c4]"}`} />)}
          </div>
        </header>

        <form action={formAction} onSubmit={handleSubmit} className="rounded-3xl border border-[#ded7c9] bg-white p-6 shadow-sm sm:p-9">
          {stage !== 1 && (
            <>
              <input type="hidden" name="username" value={values.username} />
              <input type="hidden" name="displayName" value={values.displayName} />
              <input type="hidden" name="bio" value={values.bio} />
            </>
          )}
          <input type="hidden" name="interestIds" value={JSON.stringify(values.interestIds)} />
          {stage === 1 && (
            <section aria-labelledby="identity-title">
              <h1 id="identity-title" className="text-3xl font-semibold tracking-tight">Your identity</h1>
              <p className="mt-2 text-[#5f6962]">Choose how you’ll appear across Diong.</p>
              <div className="mt-7 space-y-5">
                <label className="block text-sm font-semibold">
                  Username
                  <input name="username" value={values.username} onChange={(event) => { usernameCheckId.current += 1; updateProfileValue("username", event.target.value); setAvailability(""); }} onBlur={checkUsername} required aria-invalid={Boolean(errors.username)} aria-describedby="username-help username-error" className="mt-2 min-h-12 w-full rounded-xl border border-[#cfc8bb] px-4 font-normal outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20" />
                </label>
                <p id="username-help" className="text-xs leading-5 text-[#69726c]">3–30 characters. Lowercase letters, numbers and underscores only. Reserved names cannot be used.</p>
                <p id="username-error" role="status" className={`text-sm ${errors.username ? "text-[#9b3829]" : "text-[#566b3d]"}`}>{errors.username ?? (checking ? "Checking…" : availability)}</p>
                <label className="block text-sm font-semibold">
                  Display name
                  <input name="displayName" value={values.displayName} onChange={(event) => updateProfileValue("displayName", event.target.value)} maxLength={60} required aria-invalid={Boolean(errors.displayName)} aria-describedby="display-name-error" className="mt-2 min-h-12 w-full rounded-xl border border-[#cfc8bb] px-4 font-normal outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20" />
                </label>
                <p id="display-name-error" className="text-sm text-[#9b3829]">{errors.displayName}</p>
                <label className="block text-sm font-semibold">
                  Bio <span className="font-normal text-[#69726c]">(optional)</span>
                  <textarea name="bio" value={values.bio} onChange={(event) => updateProfileValue("bio", event.target.value)} maxLength={300} rows={4} aria-invalid={Boolean(errors.bio)} aria-describedby="bio-help bio-error" className="mt-2 w-full rounded-xl border border-[#cfc8bb] px-4 py-3 font-normal outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20" />
                </label>
                <p id="bio-help" className="text-xs text-[#69726c]">{values.bio.length}/300 characters</p>
                <p id="bio-error" className="text-sm text-[#9b3829]">{errors.bio}</p>
              </div>
            </section>
          )}

          {stage === 2 && (
            <section aria-labelledby="direction-title">
              <h1 id="direction-title" className="text-3xl font-semibold tracking-tight">Your direction</h1>
              <p className="mt-2 max-w-2xl text-[#5f6962]">Choose 1–5 interests. Later, these will help Diong choose Prime Protocols that are relevant to what you want to work on.</p>
              <p className="mt-4 text-sm font-semibold">{values.interestIds.length} of 5 selected</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {interests.map((interest) => {
                  const selected = values.interestIds.includes(interest.id);
                  return (
                    <button key={interest.id} type="button" aria-pressed={selected} onClick={() => toggleInterest(interest.id)} className={`rounded-2xl border p-4 text-left transition ${selected ? "border-[#6f7b4f] bg-[#eef2e5]" : "border-[#ded7c9] hover:border-[#a8ae94]"}`}>
                      <span className="block font-semibold">{interest.name}</span>
                      <span className="mt-1 block text-sm leading-5 text-[#626c65]">{interest.description}</span>
                    </button>
                  );
                })}
              </div>
              <p role="alert" className="mt-3 text-sm text-[#9b3829]">{errors.interestIds}</p>
            </section>
          )}

          {stage === 3 && (
            <section aria-labelledby="confirmation-title">
              <h1 id="confirmation-title" className="text-3xl font-semibold tracking-tight">Ready to begin</h1>
              <p className="mt-2 text-[#5f6962]">Review your choices. You can update your profile later.</p>
              <dl className="mt-7 space-y-5 rounded-2xl bg-[#f7f4ee] p-5">
                <div><dt className="text-xs font-semibold uppercase tracking-wider text-[#69726c]">Display name</dt><dd className="mt-1 font-semibold">{values.displayName}</dd></div>
                <div><dt className="text-xs font-semibold uppercase tracking-wider text-[#69726c]">Username</dt><dd className="mt-1 font-semibold">@{normalizeUsername(values.username)}</dd></div>
                <div><dt className="text-xs font-semibold uppercase tracking-wider text-[#69726c]">Interests</dt><dd className="mt-2 flex flex-wrap gap-2">{selectedInterests.map((interest) => <span key={interest.id} className="rounded-full bg-white px-3 py-1 text-sm">{interest.name}</span>)}</dd></div>
              </dl>
              <p className="mt-6 leading-7 text-[#59635c]">Next, you’ll arrive at your personal home. Daily Prime will be introduced in the next phase.</p>
            </section>
          )}

          {showServerMessage && <p role="alert" className="mt-6 rounded-xl bg-[#fff0ed] px-4 py-3 text-sm text-[#8c3527]">{state.message}</p>}
          <div className="mt-8 flex items-center justify-between gap-3 border-t border-[#ece7de] pt-6">
            <button type="button" onClick={() => setStage((current) => Math.max(1, current - 1))} disabled={stage === 1 || saving} className="min-h-11 rounded-full px-5 font-semibold text-[#4d574f] disabled:invisible">Back</button>
            {stage < 3 ? (
              <button type="button" onClick={continueToNextStage} className="min-h-11 rounded-full bg-[#1d2420] px-6 font-semibold text-white">Continue</button>
            ) : (
              <button type="submit" disabled={saving} className="min-h-11 rounded-full bg-[#1d2420] px-6 font-semibold text-white disabled:cursor-wait disabled:opacity-60">{saving ? "Saving…" : "Complete onboarding"}</button>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}
