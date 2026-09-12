import type { PostType, PostVisibility } from "@/src/types/database";

// The controlled vocabularies for social content. These mirror the
// posts_type_allowed / posts_visibility_allowed CHECK constraints and the
// create_post() / update_post() RPC guards, which stay authoritative.

export const POST_TYPES = [
  "update",
  "reflection",
  "progress",
  "learning",
  "achievement",
  "question",
  "resource",
] as const satisfies readonly PostType[];

export const POST_VISIBILITIES = [
  "public",
  "followers",
  "private",
] as const satisfies readonly PostVisibility[];

export function isPostType(value: unknown): value is PostType {
  return (
    typeof value === "string" &&
    (POST_TYPES as readonly string[]).includes(value)
  );
}

export function isPostVisibility(value: unknown): value is PostVisibility {
  return (
    typeof value === "string" &&
    (POST_VISIBILITIES as readonly string[]).includes(value)
  );
}
