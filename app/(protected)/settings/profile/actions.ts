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
import { isOwnedPath } from "@/src/lib/media/storage-paths";
import {
  safeDeleteObject,
  verifyUploadedImageSize,
} from "@/src/lib/media/storage-server";
import type { MediaActionResult } from "@/src/lib/media/media-action-result";

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

// ---------------------------------------------------------------------------
// Avatar / cover (Pass 7). The browser has already uploaded the object
// directly to Storage (see src/components/media/image-upload-field.tsx) —
// these actions only ever validate and persist the resulting storage_path,
// never proxy image bytes. Replace-then-delete: the new path is saved first;
// the old object is deleted only after that DB write succeeds.
// ---------------------------------------------------------------------------

async function updateProfileImage(
  storagePath: string,
  column: "avatar_path" | "cover_path",
  slotLabel: "avatar" | "cover",
): Promise<MediaActionResult> {
  const { supabase, userId } = await requireCompletedProfile();

  const expectedPrefix = `profiles/${userId}/${slotLabel}/`;
  if (!isOwnedPath(storagePath, expectedPrefix)) {
    return { status: "error", message: "This image cannot be used." };
  }

  const sizeCheck = await verifyUploadedImageSize(
    supabase,
    storagePath,
    slotLabel === "avatar" ? "avatar" : "cover",
  );
  if (!sizeCheck.ok) {
    await safeDeleteObject(supabase, storagePath);
    return { status: "error", message: sizeCheck.message };
  }

  const { data: current } = await supabase
    .from("profiles")
    .select("avatar_path, cover_path, username")
    .eq("id", userId)
    .maybeSingle();
  const oldPath = column === "avatar_path" ? current?.avatar_path : current?.cover_path;

  const { error } = await supabase
    .from("profiles")
    .update(
      column === "avatar_path"
        ? { avatar_path: storagePath }
        : { cover_path: storagePath },
    )
    .eq("id", userId);

  if (error) {
    await safeDeleteObject(supabase, storagePath);
    return {
      status: "error",
      message: `Your ${slotLabel} could not be saved. Try again.`,
    };
  }

  if (oldPath && oldPath !== storagePath) {
    await safeDeleteObject(supabase, oldPath);
  }

  revalidatePath("/home");
  revalidatePath("/settings/profile");
  if (current?.username) revalidatePath(`/profile/${current.username}`);

  return {
    status: "success",
    message: slotLabel === "avatar" ? "Avatar updated." : "Cover updated.",
  };
}

async function removeProfileImage(
  column: "avatar_path" | "cover_path",
  slotLabel: "avatar" | "cover",
): Promise<MediaActionResult> {
  const { supabase, userId } = await requireCompletedProfile();

  const { data: current } = await supabase
    .from("profiles")
    .select("avatar_path, cover_path, username")
    .eq("id", userId)
    .maybeSingle();
  const oldPath = column === "avatar_path" ? current?.avatar_path : current?.cover_path;

  const { error } = await supabase
    .from("profiles")
    .update(column === "avatar_path" ? { avatar_path: null } : { cover_path: null })
    .eq("id", userId);

  if (error) {
    return {
      status: "error",
      message: `Your ${slotLabel} could not be removed. Try again.`,
    };
  }

  await safeDeleteObject(supabase, oldPath);

  revalidatePath("/home");
  revalidatePath("/settings/profile");
  if (current?.username) revalidatePath(`/profile/${current.username}`);

  return {
    status: "success",
    message: slotLabel === "avatar" ? "Avatar removed." : "Cover removed.",
  };
}

export async function updateAvatar(storagePath: string): Promise<MediaActionResult> {
  return updateProfileImage(storagePath, "avatar_path", "avatar");
}

export async function removeAvatar(): Promise<MediaActionResult> {
  return removeProfileImage("avatar_path", "avatar");
}

export async function updateCover(storagePath: string): Promise<MediaActionResult> {
  return updateProfileImage(storagePath, "cover_path", "cover");
}

export async function removeCover(): Promise<MediaActionResult> {
  return removeProfileImage("cover_path", "cover");
}
