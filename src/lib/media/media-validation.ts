import {
  ALLOWED_IMAGE_MIME_TYPES,
  ALT_TEXT_MAX_LENGTH,
  MAX_POST_IMAGES,
  MEDIA_CONTEXT_MAX_BYTES,
  type AllowedImageMimeType,
  type MediaContext,
} from "./media-constants";

export interface ImageFileInput {
  mimeType: string;
  sizeBytes: number;
}

const FRIENDLY_MIME_LABELS: Record<AllowedImageMimeType, string> = {
  "image/jpeg": "JPEG",
  "image/png": "PNG",
  "image/webp": "WEBP",
};

function friendlyMimeTypeList(): string {
  return ALLOWED_IMAGE_MIME_TYPES.map((mimeType) => FRIENDLY_MIME_LABELS[mimeType]).join(", ");
}

function bytesToMb(bytes: number): number {
  return bytes / (1024 * 1024);
}

export function isAllowedImageMimeType(mimeType: string): mimeType is AllowedImageMimeType {
  return (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(mimeType);
}

export function validateImageFile(file: ImageFileInput, context: MediaContext): string | undefined {
  if (!Number.isFinite(file.sizeBytes) || file.sizeBytes <= 0) {
    return "Image file appears to be empty or invalid.";
  }

  if (!isAllowedImageMimeType(file.mimeType)) {
    return `Only ${friendlyMimeTypeList()} images are supported.`;
  }

  const maxBytes = MEDIA_CONTEXT_MAX_BYTES[context];
  if (file.sizeBytes > maxBytes) {
    return `Image must be ${bytesToMb(maxBytes)} MB or smaller.`;
  }

  return undefined;
}

export function validateAltText(altText: string | null | undefined): string | undefined {
  if (altText === null || altText === undefined) {
    return undefined;
  }

  const trimmed = altText.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  if (trimmed.length > ALT_TEXT_MAX_LENGTH) {
    return `Alt text must be ${ALT_TEXT_MAX_LENGTH} characters or fewer.`;
  }

  return undefined;
}

export function validatePostImageCount(currentCount: number, addingCount: number): string | undefined {
  const safeCurrent = Math.max(0, currentCount);
  const safeAdding = Math.max(0, addingCount);

  if (safeCurrent + safeAdding > MAX_POST_IMAGES) {
    return `A post can have at most ${MAX_POST_IMAGES} images.`;
  }

  return undefined;
}

export function validatePostMediaPosition(position: number): string | undefined {
  if (!Number.isInteger(position) || position < 0) {
    return "Position must be a non-negative whole number.";
  }

  return undefined;
}
