// Shared pagination helpers for Pass 3 (notifications / discover / search).
//
// Deliberately new rather than reaching into Pass 2's post-validation.ts, so
// that file stays untouched. The keyset ("cursor") shape mirrors
// post-validation.ts's FeedCursor exactly (same "<iso-timestamp>|<id>"
// encoding) because list_notifications() / list_discover_posts() /
// search_posts() all paginate on (created_at, id) the same way list_feed()
// does — but this module owns its own copy so Pass 2 semantics can never be
// disturbed by a Pass 3 change.

export const PAGE_SIZE = 20;
export const MAX_LIMIT = 20;
export const MAX_PAGE = 500;

export type Cursor = {
  beforeCreatedAt: string;
  beforeId: number;
};

export function encodeCursor(createdAt: string, id: number): string {
  return `${createdAt}|${id}`;
}

/**
 * Parse a cursor value. Returns null for a missing, malformed or
 * out-of-range cursor — the caller then serves the first page rather than
 * erroring.
 */
export function parseCursor(raw: unknown): Cursor | null {
  const first = Array.isArray(raw) ? raw[0] : raw;
  if (typeof first !== "string") return null;

  const sep = first.lastIndexOf("|");
  if (sep <= 0 || sep === first.length - 1) return null;

  const timestamp = first.slice(0, sep);
  const idText = first.slice(sep + 1);

  if (!/^\d{1,19}$/.test(idText)) return null;
  const id = Number(idText);
  if (!Number.isSafeInteger(id) || id <= 0) return null;

  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) return null;

  return { beforeCreatedAt: timestamp, beforeId: id };
}

/** Clamp a requested page size to [1, MAX_LIMIT]; default PAGE_SIZE. */
export function clampLimit(raw: unknown): number {
  const n =
    typeof raw === "number"
      ? raw
      : typeof raw === "string" && /^\d+$/.test(raw.trim())
        ? Number(raw.trim())
        : Number.NaN;
  if (!Number.isInteger(n) || n < 1) return PAGE_SIZE;
  return Math.min(n, MAX_LIMIT);
}

/**
 * Parse a `?page=` search param into a safe 1-based page number. Anything
 * invalid — 0, negative, non-integer, non-decimal, non-numeric, empty —
 * becomes 1. Values above the ceiling are clamped down.
 */
export function parsePageNumber(raw: unknown): number {
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
  return Math.min(n, MAX_PAGE);
}

export type OffsetPagination = {
  page: number;
  pageSize: number;
  offset: number;
};

/** Build the offset window for an already-parsed (or raw) page number. */
export function getOffsetPagination(
  page: number,
  pageSize: number = PAGE_SIZE,
): OffsetPagination {
  const safePage =
    Number.isInteger(page) && page >= 1 ? Math.min(page, MAX_PAGE) : 1;
  return { page: safePage, pageSize, offset: (safePage - 1) * pageSize };
}
