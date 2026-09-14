"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { PostMediaItem } from "@/src/types/database";
import { getPublicMediaUrl } from "@/src/lib/media/media-url";

// Responsive image grid for a post's 0-4 attached images, with a small
// accessible lightbox on click. Not a full gallery: one image at a time, no
// swipe/zoom/thumbnail strip — just enough to see an image at full size.
export function PostMediaGrid({ media }: { media: PostMediaItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const items = media
    .slice()
    .sort((a, b) => a.position - b.position)
    .slice(0, 4)
    .map((item) => ({ item, url: getPublicMediaUrl(item.storage_path) }))
    .filter((entry): entry is { item: PostMediaItem; url: string } => entry.url !== null);

  if (items.length === 0) return null;

  // 1: one large image. 2: side-by-side squares. 3: a tall image left, two
  // stacked squares right. 4: an even 2x2 grid. Never more than 4 (the
  // application already caps uploads at 4 per post).
  const gridClass =
    items.length === 1 ? "grid grid-cols-1" : "grid grid-cols-2 grid-rows-2 gap-1.5";

  function itemClass(index: number) {
    if (items.length === 1) return "aspect-[4/3]";
    if (items.length === 3 && index === 0) return "row-span-2 aspect-auto";
    return "aspect-square";
  }

  function openAt(index: number, trigger: HTMLButtonElement) {
    triggerRef.current = trigger;
    setOpenIndex(index);
  }

  function close() {
    setOpenIndex(null);
    triggerRef.current?.focus();
  }

  return (
    <div className="mt-3">
      <div className={`overflow-hidden rounded-2xl ${gridClass}`}>
        {items.map(({ item, url }, index) => (
          <button
            key={item.id}
            type="button"
            onClick={(event) => openAt(index, event.currentTarget)}
            className={`relative block w-full overflow-hidden bg-[#eee9dd] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6f7b4f]/50 ${itemClass(index)}`}
            aria-label={item.alt_text ? `View image: ${item.alt_text}` : "View image"}
          >
            <Image
              src={url}
              alt={item.alt_text ?? ""}
              fill
              sizes="(max-width: 640px) 100vw, 640px"
              className="object-cover"
            />
          </button>
        ))}
      </div>

      {openIndex !== null && items[openIndex] && (
        <Lightbox
          url={items[openIndex].url}
          altText={items[openIndex].item.alt_text}
          onClose={close}
        />
      )}
    </div>
  );
}

function Lightbox({
  url,
  altText,
  onClose,
}: {
  url: string;
  altText: string | null;
  onClose: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={altText ?? "Image"}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <button
        ref={closeButtonRef}
        type="button"
        onClick={onClose}
        aria-label="Close image"
        className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-black/50 text-xl text-white outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        ×
      </button>
      <div
        className="relative h-[85vh] w-[90vw] max-w-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <Image
          src={url}
          alt={altText ?? ""}
          fill
          sizes="90vw"
          className="rounded-lg object-contain"
        />
      </div>
    </div>
  );
}
