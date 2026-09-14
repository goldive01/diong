export const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

export const AVATAR_MAX_BYTES = 3 * 1024 * 1024;
export const COVER_MAX_BYTES = 5 * 1024 * 1024;
export const COMMUNITY_AVATAR_MAX_BYTES = 3 * 1024 * 1024;
export const COMMUNITY_COVER_MAX_BYTES = 5 * 1024 * 1024;
export const POST_IMAGE_MAX_BYTES = 6 * 1024 * 1024;

export const MAX_POST_IMAGES = 4;

export const ALT_TEXT_MAX_LENGTH = 300;

export type MediaContext =
  | "avatar"
  | "cover"
  | "community_avatar"
  | "community_cover"
  | "post_image";

export const MEDIA_CONTEXT_MAX_BYTES: Record<MediaContext, number> = {
  avatar: AVATAR_MAX_BYTES,
  cover: COVER_MAX_BYTES,
  community_avatar: COMMUNITY_AVATAR_MAX_BYTES,
  community_cover: COMMUNITY_COVER_MAX_BYTES,
  post_image: POST_IMAGE_MAX_BYTES,
};
