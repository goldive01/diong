// Display copy and formatting for the social graph. Pure, deterministic, no
// data access. The follow / block relationship itself is decided by
// public.get_social_profile(); this module only turns the returned values into
// text.

/**
 * Compact count for follower / following figures. Negatives and non-finite
 * values collapse to "0". 1,000+ uses a "k" suffix, 1,000,000+ an "m" suffix,
 * each with at most one decimal and no trailing ".0".
 */
export function formatCount(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return "0";
  }
  const n = Math.floor(value);
  if (n < 1_000) return String(n);
  if (n < 1_000_000) {
    return `${trimZero((n / 1_000).toFixed(n < 10_000 ? 1 : 0))}k`;
  }
  return `${trimZero((n / 1_000_000).toFixed(1))}m`;
}

function trimZero(text: string): string {
  return text.replace(/\.0$/, "");
}

/** "1 follower" / "12 followers" / "1.2k followers". */
export function followerLabel(count: number | null | undefined): string {
  const n = typeof count === "number" && count > 0 ? Math.floor(count) : 0;
  return n === 1 ? "1 follower" : `${formatCount(n)} followers`;
}

/** "0 following" / "8 following" / "3.4k following". */
export function followingLabel(count: number | null | undefined): string {
  const n = typeof count === "number" && count > 0 ? Math.floor(count) : 0;
  return `${formatCount(n)} following`;
}

export type FollowRelationship =
  | "self"
  | "following"
  | "not_following"
  | "blocked";

/**
 * Collapse the viewer-relative flags from get_social_profile() into a single
 * relationship value. `blocked` (the viewer has blocked the owner) takes
 * precedence over everything else.
 */
export function describeFollowRelationship(input: {
  isSelf: boolean;
  viewerFollows: boolean;
  viewerBlocked: boolean;
}): FollowRelationship {
  if (input.viewerBlocked) return "blocked";
  if (input.isSelf) return "self";
  return input.viewerFollows ? "following" : "not_following";
}

/**
 * A short, single-line bio for a person card. Trims whitespace and, when longer
 * than `max`, cuts on a character boundary and appends an ellipsis. Returns ""
 * for a missing or blank bio so callers can skip rendering.
 */
export function truncateBio(
  bio: string | null | undefined,
  max: number = 140,
): string {
  if (typeof bio !== "string") return "";
  const trimmed = bio.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}
