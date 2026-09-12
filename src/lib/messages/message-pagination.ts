// Keyset ("cursor") pagination helpers for direct messages (Pass 4).
//
// Deliberately a fresh copy rather than reaching into Pass 3's
// src/lib/social/pagination.ts, following that module's own precedent of
// owning a private copy so an earlier pass's semantics can never be disturbed
// by a later one. The shape is identical because list_conversations() /
// list_messages() paginate on a (timestamp, id) pair the same way
// list_notifications() / list_feed() do.

export const PAGE_SIZE = 20;
export const MAX_LIMIT = 20;

export type Cursor = {
  beforeAt: string;
  beforeId: number;
};

export function encodeCursor(at: string, id: number): string {
  return `${at}|${id}`;
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

  return { beforeAt: timestamp, beforeId: id };
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
