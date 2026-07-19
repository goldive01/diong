"use client";

import { useActionState } from "react";
import { updateProfile, type ProfileUpdateState } from "@/app/(protected)/settings/profile/actions";
import type { ProfileUpdateData } from "@/src/types/database";

const initialState: ProfileUpdateState = { message: "", success: false, errors: {} };

export function ProfileSettingsForm({ initialValues }: { initialValues: ProfileUpdateData }) {
  const [state, formAction, pending] = useActionState(updateProfile, initialState);
  const values = state.values ?? initialValues;

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <label className="block text-sm font-semibold">Username
        <input key={`username-${values.username}`} name="username" defaultValue={values.username} required aria-describedby="settings-username-help settings-username-error" className="mt-2 min-h-12 w-full rounded-xl border border-[#cfc8bb] px-4 font-normal outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20" />
      </label>
      <p id="settings-username-help" className="text-xs leading-5 text-[#69726c]">3–30 lowercase letters, numbers or underscores. Reserved names cannot be used.</p>
      <p id="settings-username-error" className="text-sm text-[#9b3829]">{state.errors.username}</p>
      <label className="block text-sm font-semibold">Display name
        <input key={`name-${values.displayName}`} name="displayName" defaultValue={values.displayName} maxLength={60} required aria-describedby="settings-name-error" className="mt-2 min-h-12 w-full rounded-xl border border-[#cfc8bb] px-4 font-normal outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20" />
      </label>
      <p id="settings-name-error" className="text-sm text-[#9b3829]">{state.errors.displayName}</p>
      <label className="block text-sm font-semibold">Bio <span className="font-normal text-[#69726c]">(optional)</span>
        <textarea key={`bio-${values.bio}`} name="bio" defaultValue={values.bio} maxLength={300} rows={5} aria-describedby="settings-bio-error" className="mt-2 w-full rounded-xl border border-[#cfc8bb] px-4 py-3 font-normal outline-none focus:border-[#6f7b4f] focus:ring-2 focus:ring-[#6f7b4f]/20" />
      </label>
      <p id="settings-bio-error" className="text-sm text-[#9b3829]">{state.errors.bio}</p>
      {state.message && <p role="status" className={`rounded-xl px-4 py-3 text-sm ${state.success ? "bg-[#eef2e5] text-[#44512e]" : "bg-[#fff0ed] text-[#8c3527]"}`}>{state.message}</p>}
      <button disabled={pending} className="min-h-12 rounded-full bg-[#1d2420] px-6 font-semibold text-white disabled:cursor-wait disabled:opacity-60">{pending ? "Saving…" : "Save profile"}</button>
    </form>
  );
}
