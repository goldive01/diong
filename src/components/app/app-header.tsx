"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/(auth)/actions";
import { SearchForm } from "@/src/components/social/search-form";
import { isNavLinkActive } from "@/src/lib/app/nav-active";

const NAV_LINK_CLASS =
  "rounded-full px-3 py-2 text-sm font-semibold text-[#4d574f] hover:bg-white aria-[current=page]:bg-white aria-[current=page]:text-[#1d2420]";

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const current = isNavLinkActive(pathname, href);
  return (
    <Link href={href} aria-current={current ? "page" : undefined} className={NAV_LINK_CLASS}>
      {children}
    </Link>
  );
}

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
          <NavLink href="/daily-prime">Daily Prime</NavLink>
          <details className="group relative">
            <summary className="flex min-h-10 cursor-pointer list-none items-center rounded-full px-3 py-2 text-sm font-semibold text-[#4d574f] hover:bg-white [&::-webkit-details-marker]:hidden">
              Growth
            </summary>
            <div className="absolute right-0 z-10 mt-1 w-44 rounded-2xl border border-[#ded7c9] bg-white p-1.5 shadow-lg">
              <Link href="/goals" className="block rounded-xl px-3 py-2 text-sm font-semibold text-[#4d574f] hover:bg-[#f7f4ee]">Goals</Link>
              <Link href="/habits" className="block rounded-xl px-3 py-2 text-sm font-semibold text-[#4d574f] hover:bg-[#f7f4ee]">Habits</Link>
              <Link href="/journal" className="block rounded-xl px-3 py-2 text-sm font-semibold text-[#4d574f] hover:bg-[#f7f4ee]">Journal</Link>
            </div>
          </details>
          <NavLink href="/feed">Feed</NavLink>
          <NavLink href="/discover">Discover</NavLink>
          <NavLink href="/communities">Communities</NavLink>
          <NavLink href="/connections">Connections</NavLink>
          <NavLink href="/messages">
            Messages
            {unreadMessageCount > 0 && (
              <span
                aria-label={`${unreadMessageCount} unread`}
                className="ml-1.5 rounded-full bg-[#dfe6d2] px-2 py-0.5 text-xs font-semibold text-[#465331]"
              >
                {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
              </span>
            )}
          </NavLink>
          <NavLink href="/notifications">
            Notifications
            {unreadCount > 0 && (
              <span
                aria-label={`${unreadCount} unread`}
                className="ml-1.5 rounded-full bg-[#dfe6d2] px-2 py-0.5 text-xs font-semibold text-[#465331]"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </NavLink>
          <NavLink href="/settings/profile">Profile settings</NavLink>
          <form action={logout}>
            <button className="min-h-10 rounded-full border border-[#cfc8bb] px-4 text-sm font-semibold hover:bg-white">Log out</button>
          </form>
        </div>
      </nav>
    </header>
  );
}
