import Link from "next/link";
import { logout } from "@/app/(auth)/actions";
import { SearchForm } from "@/src/components/social/search-form";

export function AppHeader({
  unreadCount = 0,
  unreadMessageCount = 0,
}: {
  unreadCount?: number;
  unreadMessageCount?: number;
}) {
  return (
    <header className="border-b border-[#ded7c9] bg-[#f7f4ee]">
      <nav aria-label="Application navigation" className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-6">
        <Link href="/home" className="text-xl font-bold tracking-tight">Diong</Link>
        <div className="order-3 w-full sm:order-none sm:w-auto">
          <SearchForm compact />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
          <Link href="/daily-prime" className="rounded-full px-3 py-2 text-sm font-semibold text-[#4d574f] hover:bg-white">Daily Prime</Link>
          <Link href="/feed" className="rounded-full px-3 py-2 text-sm font-semibold text-[#4d574f] hover:bg-white">Feed</Link>
          <Link href="/discover" className="rounded-full px-3 py-2 text-sm font-semibold text-[#4d574f] hover:bg-white">Discover</Link>
          <Link href="/connections" className="rounded-full px-3 py-2 text-sm font-semibold text-[#4d574f] hover:bg-white">Connections</Link>
          <Link
            href="/messages"
            className="rounded-full px-3 py-2 text-sm font-semibold text-[#4d574f] hover:bg-white"
          >
            Messages
            {unreadMessageCount > 0 && (
              <span
                aria-label={`${unreadMessageCount} unread`}
                className="ml-1.5 rounded-full bg-[#dfe6d2] px-2 py-0.5 text-xs font-semibold text-[#465331]"
              >
                {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
              </span>
            )}
          </Link>
          <Link
            href="/notifications"
            className="rounded-full px-3 py-2 text-sm font-semibold text-[#4d574f] hover:bg-white"
          >
            Notifications
            {unreadCount > 0 && (
              <span
                aria-label={`${unreadCount} unread`}
                className="ml-1.5 rounded-full bg-[#dfe6d2] px-2 py-0.5 text-xs font-semibold text-[#465331]"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>
          <Link href="/settings/profile" className="rounded-full px-3 py-2 text-sm font-semibold text-[#4d574f] hover:bg-white">Profile settings</Link>
          <form action={logout}>
            <button className="min-h-10 rounded-full border border-[#cfc8bb] px-4 text-sm font-semibold hover:bg-white">Log out</button>
          </form>
        </div>
      </nav>
    </header>
  );
}
