"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { logout } from "@/app/(auth)/actions";
import { SearchForm } from "@/src/components/social/search-form";
import { isNavLinkActive } from "@/src/lib/app/nav-active";

const NAV_LINK_CLASS =
  "rounded-full px-3 py-2 text-sm font-semibold text-[#4d574f] hover:bg-white aria-[current=page]:bg-white aria-[current=page]:text-[#1d2420]";

const MOBILE_NAV_LINK_CLASS =
  "block rounded-xl px-3 py-2.5 text-sm font-semibold text-[#4d574f] hover:bg-[#f7f4ee] aria-[current=page]:bg-[#eef2e5] aria-[current=page]:text-[#1d2420]";

function NavLink({
  href,
  children,
  className = NAV_LINK_CLASS,
  onNavigate,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const current = isNavLinkActive(pathname, href);
  return (
    <Link href={href} aria-current={current ? "page" : undefined} className={className} onClick={onNavigate}>
      {children}
    </Link>
  );
}

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      aria-label={`${count} unread`}
      className="ml-1.5 rounded-full bg-[#dfe6d2] px-2 py-0.5 text-xs font-semibold text-[#465331]"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function AppHeader({
  unreadCount = 0,
  unreadMessageCount = 0,
}: {
  unreadCount?: number;
  unreadMessageCount?: number;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const hasUnread = unreadCount > 0 || unreadMessageCount > 0;

  // Close on Escape and return focus to the toggle button — the same
  // pattern the post lightbox uses, so keyboard/screen-reader focus never
  // gets stranded inside a menu that just disappeared.
  useEffect(() => {
    if (!menuOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="border-b border-[#ded7c9] bg-[#f7f4ee]">
      <div className="mx-auto w-full max-w-5xl px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/home" className="text-xl font-bold tracking-tight">
            Diong
          </Link>

          <div className="order-3 w-full sm:order-none sm:w-auto">
            <SearchForm compact />
          </div>

          <nav
            aria-label="Application navigation"
            className="hidden flex-wrap items-center justify-end gap-2 sm:flex sm:gap-4"
          >
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
              <UnreadBadge count={unreadMessageCount} />
            </NavLink>
            <NavLink href="/notifications">
              Notifications
              <UnreadBadge count={unreadCount} />
            </NavLink>
            <NavLink href="/settings/profile">Profile settings</NavLink>
            <form action={logout}>
              <button className="min-h-10 rounded-full border border-[#cfc8bb] px-4 text-sm font-semibold hover:bg-white">Log out</button>
            </form>
          </nav>

          <button
            ref={menuButtonRef}
            type="button"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen((value) => !value)}
            className="relative flex min-h-11 min-w-11 items-center justify-center rounded-full border border-[#cfc8bb] text-[#3e4a41] hover:bg-white sm:hidden"
          >
            <span aria-hidden="true" className="text-lg leading-none">
              {menuOpen ? "✕" : "☰"}
            </span>
            <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
            {hasUnread && !menuOpen && (
              <span
                aria-hidden="true"
                className="absolute right-1.5 top-1.5 size-2 rounded-full bg-[#8c3527]"
              />
            )}
          </button>
        </div>

        {menuOpen && (
          <nav
            id={menuId}
            aria-label="Application navigation"
            className="mt-3 space-y-1 rounded-2xl border border-[#ded7c9] bg-white p-2 sm:hidden"
          >
            <NavLink href="/daily-prime" className={MOBILE_NAV_LINK_CLASS} onNavigate={closeMenu}>
              Daily Prime
            </NavLink>
            <NavLink href="/goals" className={MOBILE_NAV_LINK_CLASS} onNavigate={closeMenu}>
              Goals
            </NavLink>
            <NavLink href="/habits" className={MOBILE_NAV_LINK_CLASS} onNavigate={closeMenu}>
              Habits
            </NavLink>
            <NavLink href="/journal" className={MOBILE_NAV_LINK_CLASS} onNavigate={closeMenu}>
              Journal
            </NavLink>
            <NavLink href="/feed" className={MOBILE_NAV_LINK_CLASS} onNavigate={closeMenu}>
              Feed
            </NavLink>
            <NavLink href="/discover" className={MOBILE_NAV_LINK_CLASS} onNavigate={closeMenu}>
              Discover
            </NavLink>
            <NavLink href="/communities" className={MOBILE_NAV_LINK_CLASS} onNavigate={closeMenu}>
              Communities
            </NavLink>
            <NavLink href="/connections" className={MOBILE_NAV_LINK_CLASS} onNavigate={closeMenu}>
              Connections
            </NavLink>
            <NavLink href="/messages" className={MOBILE_NAV_LINK_CLASS} onNavigate={closeMenu}>
              Messages
              <UnreadBadge count={unreadMessageCount} />
            </NavLink>
            <NavLink href="/notifications" className={MOBILE_NAV_LINK_CLASS} onNavigate={closeMenu}>
              Notifications
              <UnreadBadge count={unreadCount} />
            </NavLink>
            <NavLink href="/settings/profile" className={MOBILE_NAV_LINK_CLASS} onNavigate={closeMenu}>
              Profile settings
            </NavLink>
            <form action={logout}>
              <button className="min-h-11 w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[#4d574f] hover:bg-[#f7f4ee]">
                Log out
              </button>
            </form>
          </nav>
        )}
      </div>
    </header>
  );
}
