import { describe, expect, it } from "vitest";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  ALT_TEXT_MAX_LENGTH,
  AVATAR_MAX_BYTES,
  COMMUNITY_AVATAR_MAX_BYTES,
  COMMUNITY_COVER_MAX_BYTES,
  COVER_MAX_BYTES,
  MAX_POST_IMAGES,
  MEDIA_CONTEXT_MAX_BYTES,
  POST_IMAGE_MAX_BYTES,
} from "./media-constants";
import {
  isAllowedImageMimeType,
  validateAltText,
  validateImageFile,
  validatePostImageCount,
  validatePostMediaPosition,
} from "./media-validation";

describe("media-constants", () => {
  it("has the expected V1 byte limits", () => {
    expect(AVATAR_MAX_BYTES).toBe(3 * 1024 * 1024);
    expect(COVER_MAX_BYTES).toBe(5 * 1024 * 1024);
    expect(COMMUNITY_AVATAR_MAX_BYTES).toBe(3 * 1024 * 1024);
    expect(COMMUNITY_COVER_MAX_BYTES).toBe(5 * 1024 * 1024);
    expect(POST_IMAGE_MAX_BYTES).toBe(6 * 1024 * 1024);
    expect(MAX_POST_IMAGES).toBe(4);
    expect(ALT_TEXT_MAX_LENGTH).toBe(300);
  });

  it("maps every media context to the matching byte limit", () => {
    expect(MEDIA_CONTEXT_MAX_BYTES).toEqual({
      avatar: AVATAR_MAX_BYTES,
      cover: COVER_MAX_BYTES,
      community_avatar: COMMUNITY_AVATAR_MAX_BYTES,
      community_cover: COMMUNITY_COVER_MAX_BYTES,
      post_image: POST_IMAGE_MAX_BYTES,
    });
  });
});

describe("isAllowedImageMimeType", () => {
  it("accepts every allow-listed mime type", () => {
    for (const mimeType of ALLOWED_IMAGE_MIME_TYPES) {
      expect(isAllowedImageMimeType(mimeType)).toBe(true);
    }
  });

  it("rejects mime types outside the allow list", () => {
    for (const mimeType of ["image/gif", "image/svg+xml", "application/pdf", "", "IMAGE/PNG"]) {
      expect(isAllowedImageMimeType(mimeType)).toBe(false);
    }
  });
});

describe("validateImageFile", () => {
  it("accepts a file exactly at the context limit", () => {
    expect(
      validateImageFile({ mimeType: "image/png", sizeBytes: AVATAR_MAX_BYTES }, "avatar"),
    ).toBeUndefined();
    expect(
      validateImageFile({ mimeType: "image/jpeg", sizeBytes: COVER_MAX_BYTES }, "cover"),
    ).toBeUndefined();
    expect(
      validateImageFile(
        { mimeType: "image/webp", sizeBytes: POST_IMAGE_MAX_BYTES },
        "post_image",
      ),
    ).toBeUndefined();
  });

  it("rejects a file one byte over the context limit", () => {
    expect(
      validateImageFile(
        { mimeType: "image/png", sizeBytes: AVATAR_MAX_BYTES + 1 },
        "avatar",
      ),
    ).toBeTruthy();
    expect(
      validateImageFile(
        { mimeType: "image/jpeg", sizeBytes: COVER_MAX_BYTES + 1 },
        "cover",
      ),
    ).toBeTruthy();
  });

  it("accepts every allowed mime type under the given context's limit", () => {
    for (const mimeType of ALLOWED_IMAGE_MIME_TYPES) {
      expect(validateImageFile({ mimeType, sizeBytes: 1024 }, "avatar")).toBeUndefined();
    }
  });

  it("rejects disallowed mime types with a friendly message", () => {
    for (const mimeType of ["image/gif", "image/svg+xml", "application/pdf"]) {
      const error = validateImageFile({ mimeType, sizeBytes: 1024 }, "avatar");
      expect(error).toBeTruthy();
      expect(error).toMatch(/JPEG/);
      expect(error).toMatch(/PNG/);
      expect(error).toMatch(/WEBP/);
    }
  });

  it("checks mime type before size, so a bad mime type wins over an oversized file", () => {
    const error = validateImageFile(
      { mimeType: "image/gif", sizeBytes: AVATAR_MAX_BYTES + 1 },
      "avatar",
    );
    expect(error).toMatch(/JPEG/);
  });

  it("rejects non-finite, NaN or non-positive sizes", () => {
    for (const sizeBytes of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(
        validateImageFile({ mimeType: "image/png", sizeBytes }, "avatar"),
      ).toBeTruthy();
    }
  });

  it("states the limit in MB for community contexts", () => {
    const error = validateImageFile(
      { mimeType: "image/png", sizeBytes: COMMUNITY_AVATAR_MAX_BYTES + 1 },
      "community_avatar",
    );
    expect(error).toMatch(/3 MB/);

    const coverError = validateImageFile(
      { mimeType: "image/png", sizeBytes: COMMUNITY_COVER_MAX_BYTES + 1 },
      "community_cover",
    );
    expect(coverError).toMatch(/5 MB/);
  });
});

describe("validateAltText", () => {
  it("accepts null, undefined, empty and whitespace-only alt text", () => {
    expect(validateAltText(null)).toBeUndefined();
    expect(validateAltText(undefined)).toBeUndefined();
    expect(validateAltText("")).toBeUndefined();
    expect(validateAltText("   ")).toBeUndefined();
  });

  it("accepts alt text exactly at the max length", () => {
    expect(validateAltText("x".repeat(ALT_TEXT_MAX_LENGTH))).toBeUndefined();
  });

  it("rejects alt text one character over the max length", () => {
    expect(validateAltText("x".repeat(ALT_TEXT_MAX_LENGTH + 1))).toBeTruthy();
  });

  it("trims surrounding whitespace before checking length", () => {
    const padded = `  ${"x".repeat(ALT_TEXT_MAX_LENGTH)}  `;
    expect(validateAltText(padded)).toBeUndefined();
  });
});

describe("validatePostImageCount", () => {
  it("accepts a total exactly at the max", () => {
    expect(validatePostImageCount(MAX_POST_IMAGES - 1, 1)).toBeUndefined();
    expect(validatePostImageCount(0, MAX_POST_IMAGES)).toBeUndefined();
  });

  it("rejects a total over the max", () => {
    expect(validatePostImageCount(MAX_POST_IMAGES, 1)).toBeTruthy();
    expect(validatePostImageCount(2, MAX_POST_IMAGES)).toBeTruthy();
  });

  it("clamps negative inputs to zero instead of letting them defeat the check", () => {
    expect(validatePostImageCount(-5, MAX_POST_IMAGES)).toBeUndefined();
    expect(validatePostImageCount(MAX_POST_IMAGES, -5)).toBeUndefined();
    expect(validatePostImageCount(-100, -100)).toBeUndefined();
  });
});

describe("validatePostMediaPosition", () => {
  it("accepts non-negative integers", () => {
    expect(validatePostMediaPosition(0)).toBeUndefined();
    expect(validatePostMediaPosition(3)).toBeUndefined();
  });

  it("rejects negative numbers", () => {
    expect(validatePostMediaPosition(-1)).toBeTruthy();
  });

  it("rejects non-integers", () => {
    expect(validatePostMediaPosition(1.5)).toBeTruthy();
    expect(validatePostMediaPosition(Number.NaN)).toBeTruthy();
  });
});
