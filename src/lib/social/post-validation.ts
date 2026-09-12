// Pure validation, normalisation and pagination parsing for the social-content
// application layer.
//
// This is a usability / guard layer for the server actions, forms and route
// params. It does NOT replace the database (CHECK constraints, the comment
// trigger) or the SECURITY DEFINER RPCs, which stay authoritative for every
// rule below.

import { isPostType, isPostVisibility } from "./post-vocab";

export const POST_BODY_MAX = 5000;
export const COMMENT_BODY_MAX = 2000;

// One request / page of the feed and every post list.
export const FEED_PAGE_SIZE = 20;

// Hard ceiling on a requested page size, so a hostile `p_limit` can never ask
// the database for an unbounded slice. The RPCs clamp to 20 as well.
export const FEED_MAX_LIMIT = 20;

// Control characters to strip from a body, keeping tab and newline;
// covers the C0 control range plus DEL.

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/**
 * Normalise a post or comment body: strip control characters except newline and
 * tab, normalise Windows / old-Mac line endings to "\n", collapse 3+ blank
 * lines to 2, and trim outer whitespace. Interior formatting the writer chose
 * is preserved — the body is always rendered as plain text.
 */
export function normalizePostBody(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(CONTROL_CHARS, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export type PostInput = {
  postType: string;
  body: string;
  visibility: string;
};

export type PostField = "postType" | "body" | "visibility";
export type PostErrors = Partial<Record<PostField, string>>;

export function validatePostInput(input: PostInput): PostErrors {
  const errors: PostErrors = {};

  if (!isPostType(input.postType)) {
    errors.postType = "Choose a post type.";
  }

  if (!isPostVisibility(input.visibility)) {
    errors.visibility = "Choose who can see this.";
  }

  const body = normalizePostBody(input.body);
  if (body.length === 0) {
    errors.body = "Write something to share.";
  } else if (body.length > POST_BODY_MAX) {
    errors.body = `Keep your post to ${POST_BODY_MAX.toLocaleString()} characters or fewer.`;
  }

  return errors;
}

export type CommentInput = {
  body: string;
  parentCommentId: number | null;
};

export type CommentField = "body";
export type CommentErrors = Partial<Record<CommentField, string>>;

export function validateCommentInput(input: CommentInput): CommentErrors {
  const errors: CommentErrors = {};
  const body = normalizePostBody(input.body);
  if (body.length === 0) {
    errors.body = "Write a comment first.";
  } else if (body.length > COMMENT_BODY_MAX) {
    errors.body = `Keep your comment to ${COMMENT_BODY_MAX.toLocaleString()} characters or fewer.`;
  }
  return errors;
}

export function hasErrors(errors: PostErrors | CommentErrors): boolean {
  return Object.keys(errors).length > 0;
}

/**
 * Parse a `?parent=` / bound reply target into a positive integer id, or null.
 * Anything invalid becomes null (a top-level comment).
 */
export function parseCommentParentId(raw: unknown): number | null {
  const first = Array.isArray(raw) ? raw[0] : raw;
  if (typeof first === "number") {
    return Number.isSafeInteger(first) && first > 0 ? first : null;
  }
  if (typeof first === "string" && /^\d+$/.test(first.trim())) {
    const n = Number(first.trim());
    return Number.isSafeInteger(n) && n > 0 ? n : null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Keyset ("cursor") pagination
// ---------------------------------------------------------------------------
//
// A feed / list cursor is the (created_at, id) of the last row already shown,
// serialised as "<iso-timestamp>|<id>". The full timestamp is kept (no
// millisecond truncation) so two rows created in the same millisecond that
// straddle a page boundary cannot be skipped. It is an opaque server↔client
// action payload, never a URL parameter.

export type FeedCursor = {
  beforeCreatedAt: string;
  beforeId: number;
};

export function encodeFeedCursor(createdAt: string, id: number): string {
  return `${createdAt}|${id}`;
}

/**
 * Parse a cursor value. Returns null for a missing, malformed or out-of-range
 * cursor — the caller then serves the first page rather than erroring.
 */
export function parseFeedCursor(raw: unknown): FeedCursor | null {
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

/** Clamp a requested page size to [1, FEED_MAX_LIMIT]; default FEED_PAGE_SIZE. */
export function clampLimit(raw: unknown): number {
  const n =
    typeof raw === "number"
      ? raw
      : typeof raw === "string" && /^\d+$/.test(raw.trim())
        ? Number(raw.trim())
        : Number.NaN;
  if (!Number.isInteger(n) || n < 1) return FEED_PAGE_SIZE;
  return Math.min(n, FEED_MAX_LIMIT);
}
