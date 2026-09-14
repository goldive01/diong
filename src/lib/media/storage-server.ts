import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/src/types/database";
import { MEDIA_CONTEXT_MAX_BYTES, type MediaContext } from "@/src/lib/media/media-constants";

const PUBLIC_MEDIA_BUCKET = "diong-public-media";

// Server-only helpers shared by every Pass 7 Server Action that persists a
// Storage path. Never used in a Client Component — each caller already runs
// on the server with an authenticated SupabaseClient from
// requireCompletedProfile().

/**
 * The size Supabase Storage itself recorded for an already-uploaded object —
 * never the client's claimed File.size — read back via list(). Returns null
 * if the object cannot be found or the listing fails.
 */
export async function getUploadedObjectSize(
  supabase: SupabaseClient<Database>,
  storagePath: string,
): Promise<number | null> {
  const lastSlash = storagePath.lastIndexOf("/");
  const folder = lastSlash >= 0 ? storagePath.slice(0, lastSlash) : "";
  const filename = lastSlash >= 0 ? storagePath.slice(lastSlash + 1) : storagePath;

  const { data, error } = await supabase.storage
    .from(PUBLIC_MEDIA_BUCKET)
    .list(folder, { search: filename });

  if (error || !data) return null;
  const match = data.find((entry) => entry.name === filename);
  const size = match?.metadata?.size;
  return typeof size === "number" ? size : null;
}

/**
 * Authoritative, context-specific size check against the object Storage
 * actually holds. Avatar/cover/community images carry no size_bytes column
 * (unlike post_media), so this — plus the bucket's own file_size_limit /
 * allowed_mime_types — is the enforcement for those contexts.
 */
export async function verifyUploadedImageSize(
  supabase: SupabaseClient<Database>,
  storagePath: string,
  context: MediaContext,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const size = await getUploadedObjectSize(supabase, storagePath);
  if (size === null) {
    return { ok: false, message: "This image could not be verified. Try again." };
  }

  const limit = MEDIA_CONTEXT_MAX_BYTES[context];
  if (size > limit) {
    return {
      ok: false,
      message: `Image must be ${Math.round(limit / (1024 * 1024))} MB or smaller.`,
    };
  }

  return { ok: true };
}

/**
 * Best-effort delete: tolerates an already-missing object and never throws —
 * used both for cleaning up a newly uploaded orphan after a failed DB write,
 * and for removing an old avatar/cover only after its replacement has
 * already been saved successfully.
 */
export async function safeDeleteObject(
  supabase: SupabaseClient<Database>,
  storagePath: string | null | undefined,
): Promise<void> {
  if (!storagePath) return;
  try {
    await supabase.storage.from(PUBLIC_MEDIA_BUCKET).remove([storagePath]);
  } catch {
    // Storage errors are never surfaced verbatim to the UI, and a
    // already-missing object is not a failure worth reporting.
  }
}
