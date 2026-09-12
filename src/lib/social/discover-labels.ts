// Display copy for Discover. Pure, deterministic, no data access.

/**
 * "" for no overlap, "1 shared interest" / "3 shared interests" otherwise —
 * so a card can skip rendering the line entirely when there is nothing to say.
 */
export function sharedInterestLabel(count: number | null | undefined): string {
  const n = typeof count === "number" && count > 0 ? Math.floor(count) : 0;
  if (n === 0) return "";
  return n === 1 ? "1 shared interest" : `${n} shared interests`;
}
