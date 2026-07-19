"use server";

import { redirect } from "next/navigation";
import { requireAuthenticatedUser } from "@/src/lib/auth";
import {
  hasValidationErrors,
  normalizeUsername,
  validateOnboarding,
  type ProfileErrors,
} from "@/src/lib/profile-validation";
import type { OnboardingFormData } from "@/src/types/database";

export interface OnboardingState {
  message: string;
  errors: ProfileErrors;
  values?: OnboardingFormData;
}

function parseOnboarding(formData: FormData): OnboardingFormData {
  const rawInterestIds = formData.get("interestIds");
  let interestIds: number[] = [];
  if (typeof rawInterestIds === "string") {
    try {
      const parsed: unknown = JSON.parse(rawInterestIds);
      if (Array.isArray(parsed)) interestIds = parsed.filter((id): id is number => typeof id === "number");
    } catch {
      interestIds = [];
    }
  }

  return {
    username: normalizeUsername(String(formData.get("username") ?? "")),
    displayName: String(formData.get("displayName") ?? "").trim(),
    bio: String(formData.get("bio") ?? "").trim(),
    interestIds,
  };
}

export async function checkUsernameAvailability(username: string) {
  const auth = await requireAuthenticatedUser();
  const normalized = normalizeUsername(username);
  const errors = validateOnboarding({
    username: normalized,
    displayName: "Valid",
    bio: "",
    interestIds: [1],
  });
  if (errors.username) return { available: false, message: errors.username };

  const { data } = await auth.supabase
    .from("profiles")
    .select("id")
    .eq("username", normalized)
    .neq("id", auth.userId)
    .maybeSingle();

  return data
    ? { available: false, message: "That username is already taken." }
    : { available: true, message: "Username is available." };
}

export async function completeOnboarding(
  _: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const values = parseOnboarding(formData);
  const errors = validateOnboarding(values);
  if (hasValidationErrors(errors)) return { message: "Check the highlighted fields.", errors, values };

  const auth = await requireAuthenticatedUser();
  const { data: activeInterests } = await auth.supabase
    .from("interests")
    .select("id")
    .in("id", values.interestIds)
    .eq("is_active", true);

  if (!activeInterests || activeInterests.length !== new Set(values.interestIds).size) {
    return {
      message: "One or more interests are no longer available.",
      errors: { interestIds: "Review your selected interests." },
      values,
    };
  }

  const { error } = await auth.supabase.rpc("complete_onboarding", {
    p_username: values.username,
    p_display_name: values.displayName,
    p_bio: values.bio || null,
    p_interest_ids: values.interestIds,
  });

  if (error?.code === "23505") {
    return {
      message: "That username was just taken. Choose another.",
      errors: { username: "That username is already taken." },
      values,
    };
  }
  if (error) return { message: "Onboarding could not be saved. Please try again.", errors: {}, values };

  redirect("/home");
}
