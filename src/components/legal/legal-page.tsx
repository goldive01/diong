import Link from "next/link";
import type { ReactNode } from "react";

// Shared shell for the /privacy and /terms informational pages. Public, so it
// carries its own minimal header and a link back to the landing page.
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f7f4ee] text-[#1d2420]">
      <header className="border-b border-[#ded7c9] bg-[#f7f4ee]">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-4 sm:px-6">
          <Link href="/" className="text-xl font-bold tracking-tight">
            Diong
          </Link>
          <Link
            href="/register"
            className="inline-flex min-h-10 items-center rounded-full bg-[#1d2420] px-4 text-sm font-semibold text-white transition hover:bg-[#2f3a34] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d2420] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7f4ee]"
          >
            Start free
          </Link>
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-3xl px-5 py-12 focus:outline-none sm:px-6 sm:py-16"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6f7b4f]">
          Diong
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          {title}
        </h1>
        <p className="mt-3 text-sm text-[#7a8378]">Last updated {updated}</p>

        <div className="mt-8 space-y-4 leading-7 text-[#41493f] [&_a:hover]:underline [&_a]:font-semibold [&_a]:text-[#59654a] [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-[#1d2420] [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
          {children}
        </div>

        <p className="mt-12 border-t border-[#e0dacd] pt-6 text-sm">
          <Link
            href="/"
            className="font-semibold text-[#59654a] hover:underline"
          >
            ← Back to Diong
          </Link>
        </p>
      </main>
    </div>
  );
}
