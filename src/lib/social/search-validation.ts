// Pure validation and normalisation for global search. This is a usability /
// guard layer for the search page and its server actions — it does NOT
// replace the database, which re-clamps query length itself inside
// search_people() / search_posts().

export const MIN_QUERY_LENGTH = 2;
export const MAX_QUERY_LENGTH = 100;

export type ParsedSearchQuery = {
  /** Trimmed, whitespace-collapsed query text (possibly ""). */
  query: string;
  /** True when `query` is within [MIN_QUERY_LENGTH, MAX_QUERY_LENGTH]. */
  valid: boolean;
};

/**
 * Normalise a raw `?q=` value: trim, collapse runs of whitespace to a single
 * space, and cap the length read from the input so a huge string is never
 * even fully retained. `valid` is false for an empty query (nothing to
 * search) and for anything shorter than MIN_QUERY_LENGTH or longer than
 * MAX_QUERY_LENGTH — a too-long value is still reported (truncated) so the
 * caller can render a specific "too long" message rather than silently
 * dropping input.
 */
export function parseSearchQuery(raw: unknown): ParsedSearchQuery {
  const first = Array.isArray(raw) ? raw[0] : raw;
  if (typeof first !== "string") return { query: "", valid: false };

  // Cap what we even look at, well above MAX_QUERY_LENGTH, so a pathological
  // multi-megabyte string is never fully scanned by the whitespace collapse.
  const bounded = first.slice(0, MAX_QUERY_LENGTH + 1000);
  const query = bounded.trim().replace(/\s+/g, " ").slice(0, MAX_QUERY_LENGTH);

  const valid = query.length >= MIN_QUERY_LENGTH;
  return { query, valid };
}
