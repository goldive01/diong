"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import type { PostMediaItem } from "@/src/types/database";
import { getPublicMediaUrl } from "@/src/lib/media/media-url";
import { removePostMediaAction } from "@/app/(protected)/posts/actions";

// Post-edit image management: remove an existing image. Adding a new image
// during edit is deferred — creating a post with images already covers the
// common case, and this keeps the edit flow small and reliable (documented
// in docs/MEDIA_PROFILE_STORAGE.md).
export function PostMediaEditor({
  postId,
  initialMedia,
}: {
  postId: number;
  initialMedia: PostMediaItem[];
}) {
  const [media, setMedia] = useState(
    initialMedia.slice().sort((a, b) => a.position - b.position),
  );
  const [error, setError] = useState("");
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  if (media.length === 0) return null;

  function onRemove(mediaId: number) {
    setError("");
    setPendingId(mediaId);
    startTransition(async () => {
      const result = await removePostMediaAction(postId, mediaId);
      setPendingId(null);
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      setMedia((current) => current.filter((item) => item.id !== mediaId));
    });
  }

  return (
    <div>
      <span className="block text-sm font-semibold">Images</span>
      <ul className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {media.map((item) => {
          const url = getPublicMediaUrl(item.storage_path);
          if (!url) return null;
          return (
            <li key={item.id} className="relative aspect-square overflow-hidden rounded-xl bg-[#eee9dd]">
              <Image src={url} alt={item.alt_text ?? ""} fill className="object-cover" />
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                disabled={pendingId === item.id}
                aria-label="Remove this image"
                className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-sm text-white outline-none disabled:cursor-wait disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-white"
              >
                ×
              </button>
            </li>
          );
        })}
      </ul>
      {error && (
        <p role="alert" className="mt-2 text-sm text-[#9b3829]">
          {error}
        </p>
      )}
    </div>
  );
}
