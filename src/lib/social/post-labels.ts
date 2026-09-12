// Display copy and formatting for social content. Pure, deterministic, no data
// access. Tone is calm and growth-centred; no engagement or FOMO language.

import type { PostType, PostVisibility } from "@/src/types/database";
import { formatCount } from "./social-labels";

export const POST_TYPE_LABEL: Record<PostType, string> = {
  update: "Progress update",
  reflection: "Reflection",
  progress: "Progress",
  learning: "Something I learned",
  achievement: "Achievement",
  question: "Question",
  resource: "Useful resource",
};

// Short prompt shown next to each choice in the composer.
export const POST_TYPE_HINT: Record<PostType, string> = {
  update: "Where you are with something you are working on.",
  reflection: "A thought worth keeping from your practice.",
  progress: "A concrete step forward.",
  learning: "One thing you now understand better.",
  achievement: "Something you finished or reached.",
  question: "Ask the community for a useful perspective.",
  resource: "A book, tool or article that helped you.",
};

export const POST_VISIBILITY_LABEL: Record<PostVisibility, string> = {
  public: "Everyone on Diong",
  followers: "Followers only",
  private: "Only me",
};

export const POST_VISIBILITY_SHORT: Record<PostVisibility, string> = {
  public: "Public",
  followers: "Followers",
  private: "Private",
};

export function postTypeLabel(type: string): string {
  return type in POST_TYPE_LABEL
    ? POST_TYPE_LABEL[type as PostType]
    : "Post";
}

export function visibilityShort(visibility: string): string {
  return visibility in POST_VISIBILITY_SHORT
    ? POST_VISIBILITY_SHORT[visibility as PostVisibility]
    : "Post";
}

/** "1 like" / "12 likes" / "1.2k likes". */
export function likeLabel(count: number | null | undefined): string {
  const n = typeof count === "number" && count > 0 ? Math.floor(count) : 0;
  return n === 1 ? "1 like" : `${formatCount(n)} likes`;
}

/** "1 comment" / "4 comments". */
export function commentLabel(count: number | null | undefined): string {
  const n = typeof count === "number" && count > 0 ? Math.floor(count) : 0;
  return n === 1 ? "1 comment" : `${formatCount(n)} comments`;
}

const RELATIVE = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" });

const ABSOLUTE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/**
 * A calm timestamp: "just now", "3 hours ago", "yesterday" for the last week,
 * then an absolute date. `now` is injectable for deterministic tests.
 */
export function formatPostTimestamp(
  iso: string | null | undefined,
  now: Date = new Date(),
): string {
  if (typeof iso !== "string") return "";
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";

  const diffMs = then - now.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const absSec = Math.abs(diffSec);

  if (absSec < 45) return "just now";
  if (absSec < 3600) return RELATIVE.format(Math.round(diffSec / 60), "minute");
  if (absSec < 86_400) return RELATIVE.format(Math.round(diffSec / 3600), "hour");
  if (absSec < 7 * 86_400) {
    return RELATIVE.format(Math.round(diffSec / 86_400), "day");
  }
  return ABSOLUTE.format(new Date(then));
}
