"use client";

import { useState, useTransition } from "react";
import type { NotificationItem } from "@/src/lib/social/notification-data";
import { NotificationRow } from "@/src/components/social/notification-row";

type LoadMore = (
  cursor: string | null,
) => Promise<{ notifications: NotificationItem[]; nextCursor: string | null }>;

// A chronological list of notifications with an accessible "Load more"
// control. The first page is server-rendered; later pages are appended via a
// server action. Structurally identical to PostFeed's load-more pattern.
export function NotificationFeed({
  initialNotifications,
  initialCursor,
  loadMore,
  emptyText,
}: {
  initialNotifications: NotificationItem[];
  initialCursor: string | null;
  loadMore: LoadMore;
  emptyText: string;
}) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(
    initialNotifications,
  );
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function onLoadMore() {
    setError("");
    startTransition(async () => {
      try {
        const batch = await loadMore(cursor);
        setNotifications((current) => {
          const seen = new Set(current.map((n) => n.id));
          return [
            ...current,
            ...batch.notifications.filter((n) => !seen.has(n.id)),
          ];
        });
        setCursor(batch.nextCursor);
      } catch {
        setError("Could not load more notifications. Please try again.");
      }
    });
  }

  if (notifications.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-[#d8d1c4] px-4 py-10 text-center text-sm text-[#68716b]">
        {emptyText}
      </p>
    );
  }

  return (
    <div>
      <ul className="space-y-3">
        {notifications.map((notification) => (
          <NotificationRow key={notification.id} notification={notification} />
        ))}
      </ul>

      {cursor && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={pending}
            className="min-h-11 rounded-full border border-[#cfc8bb] px-6 text-sm font-semibold text-[#3e4a41] transition hover:bg-white disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f7b4f]/40"
          >
            {pending ? "Loading…" : "Load more"}
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-center text-sm text-[#9b3f37]">
          {error}
        </p>
      )}
    </div>
  );
}
