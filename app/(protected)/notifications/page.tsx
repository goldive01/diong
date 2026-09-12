import { requireCompletedProfile } from "@/src/lib/auth";
import {
  getUnreadNotificationCount,
  listNotifications,
} from "@/src/lib/social/notification-data";
import { PAGE_SIZE } from "@/src/lib/social/pagination";
import { NotificationFeed } from "@/src/components/social/notification-feed";
import {
  loadMoreNotifications,
  markAllNotificationsReadAction,
} from "@/app/(protected)/notifications/actions";

export const metadata = {
  title: "Notifications",
};

export default async function NotificationsPage() {
  const { supabase } = await requireCompletedProfile();
  const [page, unreadCount] = await Promise.all([
    listNotifications(supabase, { limit: PAGE_SIZE }),
    getUnreadNotificationCount(supabase),
  ]);
  const hasUnread = unreadCount > 0;

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-6 sm:py-14">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6f7b4f]">
            Notifications
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Your activity
          </h1>
        </div>
        {hasUnread && (
          <form action={markAllNotificationsReadAction}>
            <button
              type="submit"
              className="min-h-11 rounded-full border border-[#cfc8bb] px-4 text-sm font-semibold text-[#3e4a41] transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f7b4f]/40"
            >
              Mark all read
            </button>
          </form>
        )}
      </header>

      <section aria-label="Your notifications">
        <NotificationFeed
          initialNotifications={page.notifications}
          initialCursor={page.nextCursor}
          loadMore={loadMoreNotifications}
          emptyText="Nothing yet. When someone follows you, likes, comments or replies, it will show up here."
        />
      </section>
    </main>
  );
}
