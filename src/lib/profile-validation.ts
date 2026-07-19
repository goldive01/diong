import type { OnboardingFormData, ProfileUpdateData } from "@/src/types/database";

export const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "api",
  "auth",
  "community",
  "diong",
  "explore",
  "help",
  "home",
  "login",
  "logout",
  "notifications",
  "profile",
  "register",
  "settings",
  "support",
]);

export type ProfileField = "username" | "displayName" | "bio" | "interestIds";
export type ProfileErrors = Partial<Record<ProfileField, string>>;

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function validateProfile(data: ProfileUpdateData): ProfileErrors {
  const errors: ProfileErrors = {};
  const username = normalizeUsername(data.username);
  const displayName = data.displayName.trim();
  const bio = data.bio.trim();

  if (username.length < 3 || username.length > 30) {
    errors.username = "Username must be between 3 and 30 characters.";
  } else if (!/^[a-z0-9_]+$/.test(username)) {
    errors.username = "Use only lowercase letters, numbers and underscores.";
  } else if (RESERVED_USERNAMES.has(username)) {
    errors.username = "That username is reserved. Choose another.";
  }

  if (displayName.length < 1 || displayName.length > 60) {
    errors.displayName = "Display name must be between 1 and 60 characters.";
  }

  if (bio.length > 300) {
    errors.bio = "Bio must be 300 characters or fewer.";
  }

  return errors;
}

export function validateOnboarding(data: OnboardingFormData): ProfileErrors {
  const errors = validateProfile(data);
  const uniqueInterests = new Set(data.interestIds);

  if (uniqueInterests.size < 1 || uniqueInterests.size > 5) {
    errors.interestIds = "Choose between 1 and 5 interests.";
  } else if (data.interestIds.some((id) => !Number.isSafeInteger(id) || id < 1)) {
    errors.interestIds = "One or more selected interests are invalid.";
  }

  return errors;
}

export function hasValidationErrors(errors: ProfileErrors): boolean {
  return Object.keys(errors).length > 0;
}
