"use client";

import { useId, useRef, useState, useTransition, type ChangeEvent } from "react";
import Image from "next/image";
import { validateImageFile } from "@/src/lib/media/media-validation";
import type { MediaContext } from "@/src/lib/media/media-constants";
import { getPublicMediaUrl } from "@/src/lib/media/media-url";
import { uploadToStorage } from "@/src/lib/media/upload-to-storage";
import { getInitials } from "@/src/lib/media/avatar-fallback";
import type { MediaActionResult } from "@/src/lib/media/media-action-result";

const ACCEPT = "image/jpeg,image/png,image/webp";

/**
 * A single-image upload/replace/remove control shared by avatar and cover
 * fields (profile and community). Validates the file client-side for fast
 * feedback, uploads it directly to Storage from the browser, then hands the
 * resulting storage_path to `onUpload` (a Server Action) which performs the
 * authoritative validation and persistence. `onRemove` clears the field.
 */
export function ImageUploadField({
  label,
  helpText,
  context,
  currentPath,
  buildPath,
  onUpload,
  onRemove,
  shape,
  fallbackLabel,
}: {
  label: string;
  helpText: string;
  context: MediaContext;
  currentPath: string | null;
  /** Builds the destination Storage path for a validated mime type. */
  buildPath: (mimeType: string) => string | null;
  onUpload: (storagePath: string) => Promise<MediaActionResult>;
  onRemove: () => Promise<MediaActionResult>;
  shape: "circle" | "banner";
  /** Display name used for the initials fallback (circle shape only). */
  fallbackLabel?: string;
}) {
  const fieldId = useId();
  const errorId = `${fieldId}-error`;
  const statusId = `${fieldId}-status`;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [path, setPath] = useState(currentPath);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [pending, startTransition] = useTransition();

  const displayUrl = previewUrl ?? getPublicMediaUrl(path);

  function reset() {
    if (inputRef.current) inputRef.current.value = "";
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setStatus("");

    const validationError = validateImageFile(
      { mimeType: file.type, sizeBytes: file.size },
      context,
    );
    if (validationError) {
      setError(validationError);
      reset();
      return;
    }

    const destination = buildPath(file.type);
    if (!destination) {
      setError("Choose a JPEG, PNG or WEBP image.");
      reset();
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    startTransition(async () => {
      const uploaded = await uploadToStorage(destination, file);
      if (!uploaded.ok) {
        setPreviewUrl(null);
        setError(uploaded.message);
        reset();
        return;
      }

      const result = await onUpload(destination);
      if (result.status === "error") {
        setPreviewUrl(null);
        setError(result.message);
        reset();
        return;
      }

      setPath(destination);
      setPreviewUrl(null);
      setStatus(result.message);
      reset();
    });
  }

  function onRemoveClick() {
    setError("");
    setStatus("");
    startTransition(async () => {
      const result = await onRemove();
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      setPath(null);
      setPreviewUrl(null);
      setStatus(result.message);
    });
  }

  const previewShapeClass =
    shape === "circle"
      ? "size-20 rounded-full"
      : "aspect-[3/1] w-full rounded-2xl";

  return (
    <div>
      <span className="block text-sm font-semibold">{label}</span>
      <p id={`${fieldId}-help`} className="mt-1 text-xs leading-5 text-[#69726c]">
        {helpText}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <div
          className={`relative overflow-hidden bg-[#eee9dd] ${previewShapeClass}`}
        >
          {displayUrl ? (
            <Image src={displayUrl} alt="" fill className="object-cover" />
          ) : shape === "circle" ? (
            <span className="flex size-full items-center justify-center text-2xl font-semibold text-[#465331]">
              {getInitials(fallbackLabel)}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <label
            htmlFor={fieldId}
            className="min-h-10 cursor-pointer rounded-full border border-[#cfc8bb] px-4 py-2 text-sm font-semibold text-[#3e4a41] transition hover:bg-[#f2efe7] focus-within:ring-2 focus-within:ring-[#6f7b4f]/40"
          >
            {path ? "Replace" : "Upload"}
          </label>
          <input
            ref={inputRef}
            id={fieldId}
            type="file"
            accept={ACCEPT}
            aria-describedby={`${fieldId}-help ${errorId} ${statusId}`}
            disabled={pending}
            onChange={onFileChange}
            className="sr-only"
          />
          {path && (
            <button
              type="button"
              onClick={onRemoveClick}
              disabled={pending}
              className="min-h-10 rounded-full border border-[#cfc8bb] px-4 text-sm font-semibold text-[#6b746d] transition hover:text-[#9b3f37] disabled:cursor-wait disabled:opacity-60"
            >
              Remove
            </button>
          )}
          {pending && (
            <span className="self-center text-sm text-[#7a8378]">Saving…</span>
          )}
        </div>
      </div>

      <p id={errorId} role="alert" className="mt-2 text-sm text-[#9b3829]">
        {error}
      </p>
      <p id={statusId} role="status" className="mt-1 text-sm text-[#44512e]">
        {status}
      </p>
    </div>
  );
}
