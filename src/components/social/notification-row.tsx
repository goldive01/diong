"use client";

import Link from "next/link";
import type { NotificationItem } from "@/src/lib/social/notification-data";
import {
  describeNotification,
  formatNotificationTimestamp,
  notificationHref,
} from "@/src/lib/social/notification-labels";
import { markNotificationReadAction } from "@/app/(protected)/notifications/actions";

// One notification row. Unread is marked with visible text ("New"), never
// colour alone. When the target is still available the whole row is a link
// through /notifications/open/<id> (a Route Handler that marks it read, then
// redirects) — no client JavaScript required. When the target is no longer
// available (deleted, or no longer visible to the viewer) the row renders as
// plain, non-navigable text with an explicit "Mark as read" fallback.
export function NotificationRow({
  notification,
}: {
  notification: NotificationItem;
}) {
  const unread = notification.readAt === null;
  const sentence = describeNotification(notification);
  const timestamp = formatNotificationTimestamp(notification.createdAt);
  const href = notificationHref(notification);

  const body = (
    <>
      <p className="text-sm leading-6 text-[#1d2420]">
        {sentence}
        {unread && (
          <span className="ml-2 rounded-full bg-[#eef2e5] px-2 py-0.5 text-xs font-semibold text-[#465331]">
            New
          </span>
        )}
      </p>
      <p className="mt-1 text-xs text-[#7a8378]">{timestamp}</p>
    </>
  );

  if (href) {
    return (
      <li>
        <Link
          href={`/notifications/open/${notification.id}?to=${encodeURIComponent(href)}`}
          aria-label={unread ? `${sentence} Unread.` : sentence}
          className="block rounded-2xl border border-[#e0dacd] bg-white p-4 outline-none transition hover:border-[#b9c3a3] focus-visible:ring-2 focus-visible:ring-[#6f7b4f]/30"
        >
          {body}
        </Link>
      </li>
    );
  }

  return (
    <li
      aria-label={`${sentence} This content is no longer available.${unread ? " Unread." : ""}`}
      className="rounded-2xl border border-dashed border-[#e0dacd] bg-[#f7f4ee] p-4"
    >
      {body}
      <p className="mt-1 text-xs text-[#7a8378]">
        This content is no longer available.
      </p>
      {unread && (
        <form
          action={markNotificationReadAction.bind(null, notification.id)}
          className="mt-2"
        >
          <button
            type="submit"
            className="min-h-8 rounded-full border border-[#cfc8bb] px-3 text-xs font-semibold text-[#3e4a41] transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f7b4f]/40"
          >
            Mark as read
          </button>
        </form>
      )}
    </li>
  );
}
