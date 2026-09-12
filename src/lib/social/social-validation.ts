// Pure validation and parsing for the social-graph application layer.
//
// This is a usability / guard layer for the server actions and route params.
// It does NOT replace the database (CHECK + UNIQUE constraints, the
// follows/blocks triggers) or the SECURITY DEFINER RPCs, which stay
// authoritative for every rule below.

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True only for a canonically-formatted UUID string. */
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

// A username as it may arrive in a route segment. Mirrors the
// profiles_username_format CHECK and normalizeUsername() (lowercase, trimmed,
// 3–30 chars of [a-z0-9_]).
const USERNAME_RE = /^[a-z0-9_]{3,30}$/;

export function isValidUsername(value: unknown): value is string {
  return (
    typeof value === "string" && USERNAME_RE.test(value.trim().toLowerCase())
  );
}

// ---------------------------------------------------------------------------
// Follow / block target checks
// ---------------------------------------------------------------------------

export type SocialTargetError =
  | "invalid" // not a usable user id
  | "self"; // the caller's own id — self-follow / self-block

/**
 * Validate a follow/block target against the acting user. Returns `null` when
 * the target is usable, or the reason it is not. The same rules apply to
 * following and blocking, so both actions share this check.
 */
export function checkSocialTarget(
  actingUserId: string,
  targetUserId: unknown,
): SocialTargetError | null {
  if (!isUuid(targetUserId)) return "invalid";
  if (!isUuid(actingUserId)) return "invalid";
  if (targetUserId === actingUserId) return "self";
  return null;
}

// ---------------------------------------------------------------------------
// Pagination for follower / following lists
// ---------------------------------------------------------------------------

export const FOLLOW_LIST_PAGE_SIZE = 20;

// Hard ceiling on how deep a list can be paged. 500 pages * 20 = 10,000 rows,
// which is far past anything a person browses by hand and keeps a hostile
// `?page=` value from asking the database for an enormous offset.
export const FOLLOW_LIST_MAX_PAGE = 500;

export type Pagination = {
  /** 1-based page number, already clamped to [1, FOLLOW_LIST_MAX_PAGE]. */
  page: number;
  pageSize: number;
  /** Inclusive range start for supabase `.range(from, to)`. */
  from: number;
  /** Inclusive range end for supabase `.range(from, to)`. */
  to: number;
};

/**
 * Parse a `?page=` search param (string, string[], number or undefined) into a
 * safe 1-based page number. Anything invalid — 0, negative, non-integer,
 * non-decimal (`"1e2"`, `"0x2"`), non-numeric, empty — becomes 1. Values above
 * the ceiling are clamped down. String parsing is strict base-10 digits only,
 * matching parseConnectionId().
 */
export function parseFollowListPage(raw: unknown): number {
  const first = Array.isArray(raw) ? raw[0] : raw;

  let n: number;
  if (typeof first === "number") {
    n = first;
  } else if (typeof first === "string" && /^\d+$/.test(first.trim())) {
    n = Number(first.trim());
  } else {
    return 1;
  }

  if (!Number.isInteger(n) || n < 1) return 1;
  return Math.min(n, FOLLOW_LIST_MAX_PAGE);
}

/** Build the range window for a (already parsed or raw) page number. */
export function getPagination(
  page: number,
  pageSize: number = FOLLOW_LIST_PAGE_SIZE,
): Pagination {
  const safePage =
    Number.isInteger(page) && page >= 1
      ? Math.min(page, FOLLOW_LIST_MAX_PAGE)
      : 1;
  const from = (safePage - 1) * pageSize;
  return { page: safePage, pageSize, from, to: from + pageSize - 1 };
}
