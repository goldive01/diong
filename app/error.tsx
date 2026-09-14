"use client";

import Link from "next/link";
import { useEffect } from "react";

// Error boundary for every route OUTSIDE app/(protected) — landing, auth
// (login/register/forgot-password/reset-password), onboarding, privacy,
// terms. Renders inside the root layout (keeps the skip link + fonts), so it
// only needs to replace the page content, unlike global-error.tsx which
// replaces the whole document. Never shows Supabase/Postgres text.
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route error:", error);
  }, [error]);

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-16 focus:outline-none"
    >
      <section role="alert" className="rounded-3xl border border-[#ded7c9] bg-white p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6f7b4f]">
          Diong
        </p>
        <h1 className="mt-3 text-2xl font-semibold">Something went wrong</h1>
        <p className="mt-3 leading-7 text-[#5f6962]">
          This is usually temporary. Try again, or head back to the overview.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="min-h-12 rounded-full bg-[#263b2d] px-6 font-semibold text-white transition hover:bg-[#1d3024] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#263b2d] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex min-h-12 items-center rounded-full border border-[#cfc8bb] px-6 font-semibold text-[#3e4a41] hover:bg-white"
          >
            Diong overview
          </Link>
        </div>
      </section>
    </main>
  );
}
