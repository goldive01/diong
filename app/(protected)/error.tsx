"use client";

import Link from "next/link";
import { useEffect } from "react";

// Error boundary for the authenticated area. Renders inside the protected layout
// (the app header stays visible). Logs the real error to the console for
// server/client diagnostics but never shows Supabase/Postgres text to the user.
export default function ProtectedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Protected route error:", error);
  }, [error]);

  return (
    <main className="mx-auto w-full max-w-md px-5 py-16 sm:py-24">
      <section
        role="alert"
        className="rounded-3xl border border-[#ded7c9] bg-white p-6 sm:p-8"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6f7b4f]">
          Something interrupted this page
        </p>
        <h1 className="mt-3 text-2xl font-semibold">We couldn&apos;t load this</h1>
        <p className="mt-3 leading-7 text-[#5f6962]">
          This is usually temporary. Your Primes, reflections and connections are
          saved. Try again, or head back to your home.
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
            href="/home"
            className="inline-flex min-h-12 items-center rounded-full border border-[#cfc8bb] px-6 font-semibold text-[#3e4a41] hover:bg-white"
          >
            Go to home
          </Link>
        </div>
      </section>
    </main>
  );
}
