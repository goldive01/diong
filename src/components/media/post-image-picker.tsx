"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import Image from "next/image";
import {
  validateAltText,
  validateImageFile,
  validatePostImageCount,
} from "@/src/lib/media/media-validation";
import { buildPostMediaPath } from "@/src/lib/media/storage-paths";
import { uploadToStorage } from "@/src/lib/media/upload-to-storage";
import { attachPostMediaAction } from "@/app/(protected)/posts/actions";

type StagedImage = {
  id: string;
  file: File;
  previewUrl: string;
  altText: string;
};

export type PostImagePickerHandle = {
  hasImages: boolean;
  reset: () => void;
  /** Uploads and attaches every staged image to `postId`. Never throws — a
   * per-image failure is counted but does not stop the others. */
  attachAll: (postId: number) => Promise<{ attached: number; failed: number }>;
};

function readImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

// A 0-4 image picker used by the post composer (create) and, unchanged, when
// adding an image during edit. Client-side validation is UX only — the
// authoritative check happens server-side in attach_post_media(). Images are
// uploaded and attached only once the caller has a real postId (see
// attachAll), never before.
export const PostImagePicker = forwardRef<
  PostImagePickerHandle,
  { userId: string; disabled?: boolean; fieldId?: string }
>(function PostImagePicker({ userId, disabled, fieldId = "post-images" }, ref) {
  const [images, setImages] = useState<StagedImage[]>([]);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      hasImages: images.length > 0,
      reset: () => {
        images.forEach((image) => URL.revokeObjectURL(image.previewUrl));
        setImages([]);
        setError("");
      },
      attachAll: async (postId: number) => {
        let attached = 0;
        let failed = 0;

        for (const image of images) {
          const path = buildPostMediaPath(userId, postId, image.file.type);
          if (!path) {
            failed++;
            continue;
          }

          const dimensions = await readImageDimensions(image.file);
          const uploaded = await uploadToStorage(path, image.file);
          if (!uploaded.ok) {
            failed++;
            continue;
          }

          const result = await attachPostMediaAction(postId, {
            storagePath: path,
            mimeType: image.file.type,
            sizeBytes: image.file.size,
            width: dimensions?.width ?? null,
            height: dimensions?.height ?? null,
            altText: image.altText.trim() || null,
          });

          if (result.status === "success") attached++;
          else failed++;
        }

        images.forEach((image) => URL.revokeObjectURL(image.previewUrl));
        setImages([]);
        return { attached, failed };
      },
    }),
    [images, userId],
  );

  function onFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setError("");

    const countError = validatePostImageCount(images.length, fileList.length);
    if (countError) {
      setError(countError);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const next: StagedImage[] = [];
    for (const file of Array.from(fileList)) {
      const validationError = validateImageFile(
        { mimeType: file.type, sizeBytes: file.size },
        "post_image",
      );
      if (validationError) {
        setError(validationError);
        continue;
      }
      next.push({
        id: `${crypto.randomUUID()}`,
        file,
        previewUrl: URL.createObjectURL(file),
        altText: "",
      });
    }

    setImages((current) => [...current, ...next]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeImage(id: string) {
    setImages((current) => {
      const target = current.find((image) => image.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((image) => image.id !== id);
    });
  }

  function updateAltText(id: string, value: string) {
    setImages((current) =>
      current.map((image) => (image.id === id ? { ...image, altText: value } : image)),
    );
    const altError = validateAltText(value);
    setError(altError ?? "");
  }

  const atLimit = images.length >= 4;

  return (
    <div>
      <label htmlFor={fieldId} className="block text-sm font-semibold">
        Images <span className="font-normal text-[#69726c]">(optional, up to 4)</span>
      </label>
      <input
        ref={inputRef}
        id={fieldId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        disabled={disabled || atLimit}
        onChange={(event) => onFilesSelected(event.target.files)}
        aria-describedby={`${fieldId}-help ${fieldId}-error`}
        className="mt-2 block w-full text-sm text-[#3e4a41] file:mr-3 file:min-h-10 file:rounded-full file:border file:border-[#cfc8bb] file:bg-white file:px-4 file:text-sm file:font-semibold file:text-[#3e4a41]"
      />
      <p id={`${fieldId}-help`} className="mt-1 text-xs text-[#69726c]">
        JPEG, PNG or WEBP. Up to 6 MB each.
      </p>
      <p id={`${fieldId}-error`} role="alert" className="mt-1 min-h-5 text-sm text-[#9b3829]">
        {error}
      </p>

      {images.length > 0 && (
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((image) => (
            <li key={image.id} className="space-y-1">
              <div className="relative aspect-square overflow-hidden rounded-xl bg-[#eee9dd]">
                <Image
                  src={image.previewUrl}
                  alt=""
                  fill
                  unoptimized
                  sizes="(max-width: 640px) 50vw, 25vw"
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(image.id)}
                  aria-label="Remove this image"
                  className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  ×
                </button>
              </div>
              <input
                type="text"
                value={image.altText}
                onChange={(event) => updateAltText(image.id, event.target.value)}
                placeholder="Alt text (optional)"
                maxLength={300}
                aria-label="Alt text for this image"
                className="w-full rounded-lg border border-[#cfc8bb] px-2 py-1 text-xs outline-none focus:border-[#6f7b4f]"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
