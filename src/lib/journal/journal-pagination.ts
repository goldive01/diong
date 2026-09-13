// Pagination helpers for the private Journal. A fresh, private copy —
// deliberately not reusing src/lib/social/pagination.ts or
// src/lib/communities/community-pagination.ts — following those files' own
// stated precedent of each pass owning its own offset logic so an earlier
// pass's semantics can never be disturbed by a later one.

export const PAGE_SIZE = 20;
export const MAX_PAGE = 500;

/** Parse a `?page=` search param into a safe 1-based page number. Anything
 * invalid — 0, negative, non-integer, non-decimal, non-numeric, empty —
 * becomes 1. Values above the ceiling are clamped down. */
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
export function getOffsetPagination(page: number): OffsetPagination {
  const safePage = Number.isInteger(page) && page >= 1 ? Math.min(page, MAX_PAGE) : 1;
  return { page: safePage, pageSize: PAGE_SIZE, offset: (safePage - 1) * PAGE_SIZE };
}
