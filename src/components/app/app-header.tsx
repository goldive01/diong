import Link from "next/link";
import { logout } from "@/app/(auth)/actions";

export function AppHeader() {
  return (
    <header className="border-b border-[#ded7c9] bg-[#f7f4ee]">
      <nav aria-label="Application navigation" className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-4 sm:px-6">
        <Link href="/home" className="text-xl font-bold tracking-tight">Diong</Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/daily-prime" className="rounded-full px-3 py-2 text-sm font-semibold text-[#4d574f] hover:bg-white">Daily Prime</Link>
          <Link href="/settings/profile" className="rounded-full px-3 py-2 text-sm font-semibold text-[#4d574f] hover:bg-white">Profile settings</Link>
          <form action={logout}>
            <button className="min-h-10 rounded-full border border-[#cfc8bb] px-4 text-sm font-semibold hover:bg-white">Log out</button>
          </form>
        </div>
      </nav>
    </header>
  );
}
