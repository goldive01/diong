// Display copy and formatting for direct messages. Pure, deterministic, no
// data access.

// Reuses the existing calm relative-timestamp formatter (Pass 3's own
// notification-labels.ts already sets this precedent of importing a pure,
// stable display helper across passes — unlike pagination cursor logic,
// which each pass deliberately keeps a private copy of).
export { formatPostTimestamp as formatMessageTimestamp } from "@/src/lib/social/post-labels";

const SNIPPET_MAX = 80;

/** A single-line preview of a message body for the inbox list. */
export function messageSnippet(body: string | null): string {
  if (!body) return "";
  const collapsed = body.replace(/\s+/g, " ").trim();
  if (collapsed.length <= SNIPPET_MAX) return collapsed;
  return `${collapsed.slice(0, SNIPPET_MAX - 1).trimEnd()}…`;
}
