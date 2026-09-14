const PUBLIC_MEDIA_BUCKET = "diong-public-media";

// Supabase Storage's own getPublicUrl() is pure string concatenation — no
// network call, no auth — so this builds the identical URL directly from the
// already-public NEXT_PUBLIC_SUPABASE_URL env var (the same one
// src/lib/supabase/client.ts uses) rather than requiring every presentational
// component that renders an image (Avatar, PostMediaGrid, community cards…)
// to be handed a live SupabaseClient just to compute a string. Persist only
// `storage_path` in the database; call this at render time.
export function getPublicMediaUrl(path: string | null | undefined): string | null {
  if (!path || path.trim().length === 0) {
    return null;
  }

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) {
    return null;
  }

  return `${base.replace(/\/+$/, "")}/storage/v1/object/public/${PUBLIC_MEDIA_BUCKET}/${path}`;
}
