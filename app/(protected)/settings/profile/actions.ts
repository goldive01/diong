"use server";

import { revalidatePath } from "next/cache";
import { requireCompletedProfile } from "@/src/lib/auth";
import {
  hasValidationErrors,
  normalizeUsername,
  validateProfile,
  type ProfileErrors,
} from "@/src/lib/profile-validation";
import type { ProfileUpdateData } from "@/src/types/database";

export interface ProfileUpdateState {
  message: string;
  success: boolean;
  errors: ProfileErrors;
  values?: ProfileUpdateData;
}

export async function updateProfile(
  _: ProfileUpdateState,
  formData: FormData,
): Promise<ProfileUpdateState> {
  const values: ProfileUpdateData = {
    username: normalizeUsername(String(formData.get("username") ?? "")),
    displayName: String(formData.get("displayName") ?? "").trim(),
    bio: String(formData.get("bio") ?? "").trim(),
  };
  const errors = validateProfile(values);
  if (hasValidationErrors(errors)) return { message: "Check the highlighted fields.", success: false, errors, values };

  const { supabase, userId } = await requireCompletedProfile();
  const { error } = await supabase
    .from("profiles")
    .update({ username: values.username, display_name: values.displayName, bio: values.bio || null })
    .eq("id", userId);

  if (error?.code === "23505") return { message: "That username is already taken.", success: false, errors: { username: "Choose another username." }, values };
  if (error) return { message: "Your profile could not be updated. Try again.", success: false, errors: {}, values };

  revalidatePath("/home");
  revalidatePath("/settings/profile");
  revalidatePath(`/profile/${values.username}`);
  return { message: "Profile updated.", success: true, errors: {}, values };
}
