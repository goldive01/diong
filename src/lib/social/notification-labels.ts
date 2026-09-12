// Display copy and safe link targets for notifications. Pure, deterministic,
// no data access. Tone matches the rest of the social layer: calm,
// human-readable, never leaking a deleted post's or comment's body — the
// sentence never contains post/comment content, only who did what.

import type { NotificationItem } from "./notification-data";
import { formatPostTimestamp } from "./post-labels";

const ANONYMOUS_ACTOR = "Someone";

function actorName(item: Pick<NotificationItem, "actorDisplayName">): string {
  return item.actorDisplayName?.trim() || ANONYMOUS_ACTOR;
}

/** The calm, human-readable sentence for one notification. */
export function describeNotification(
  item: Pick<NotificationItem, "notificationType" | "actorDisplayName">,
): string {
  const name = actorName(item);
  switch (item.notificationType) {
    case "new_follower":
      return `${name} started following you.`;
    case "post_like":
      return `${name} liked your post.`;
    case "post_comment":
      return `${name} commented on your post.`;
    case "comment_reply":
      return `${name} replied to your comment.`;
    default:
      return `${name} interacted with your activity.`;
  }
}

const USERNAME_RE = /^[a-z0-9_]{3,30}$/;

/**
 * The local, same-origin path a notification should open, or null when the
 * target is unavailable (deleted, no longer visible, or the actor account is
 * gone) or the underlying data is malformed. Never returns anything but one
 * of these two shapes — this is the only input to the notification-open
 * route handler's redirect, which re-validates it independently anyway.
 */
export function notificationHref(
  item: Pick<
    NotificationItem,
    "notificationType" | "actorUsername" | "targetAvailable" | "targetPostId"
  >,
): string | null {
  if (!item.targetAvailable) return null;

  if (item.notificationType === "new_follower") {
    const username = item.actorUsername?.trim().toLowerCase() ?? "";
    return USERNAME_RE.test(username) ? `/profile/${username}` : null;
  }

  if (
    typeof item.targetPostId === "number" &&
    Number.isSafeInteger(item.targetPostId) &&
    item.targetPostId > 0
  ) {
    return `/posts/${item.targetPostId}`;
  }

  return null;
}

/** Relative timestamp for a notification row — reuses the post-layer helper. */
export function formatNotificationTimestamp(
  iso: string | null | undefined,
  now?: Date,
): string {
  return formatPostTimestamp(iso, now);
}
