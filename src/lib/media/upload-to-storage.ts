"use client";

import { createClient } from "@/src/lib/supabase/client";

export type UploadResult = { ok: true } | { ok: false; message: string };

const PUBLIC_MEDIA_BUCKET = "diong-public-media";

/**
 * Uploads a File directly from the browser to the diong-public-media bucket
 * at `path` using the authenticated browser Supabase client. Storage RLS
 * (media_path_owner_ok) confirms the path belongs to the caller; the bucket's
 * own allowed_mime_types / file_size_limit reject a disallowed upload before
 * this ever reaches application code. Never routes image bytes through a
 * Server Action.
 */
export async function uploadToStorage(path: string, file: File): Promise<UploadResult> {
  const supabase = createClient();
  const { error } = await supabase.storage.from(PUBLIC_MEDIA_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    return { ok: false, message: "Upload failed. Try again." };
  }

  return { ok: true };
}
