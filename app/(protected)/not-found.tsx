import Link from "next/link";

export const metadata = {
  title: "Page not found",
};

// A dedicated 404 for the authenticated area. Without this file, a
// notFound() call anywhere under app/(protected) would fall through to the
// root app/not-found.tsx, which renders only inside the root layout — losing
// the AppHeader (nav, search, unread badges, logout) for a signed-in user
// mid-session. This file lives inside app/(protected), so it renders through
// (protected)/layout.tsx like any other page: the header stays, and the
// viewer is already known to be authenticated (requireCompletedProfile() in
// that layout already ran), so a direct Feed link is safe to offer here
// without a separate auth check.
export default function ProtectedNotFound() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col justify-center px-5 py-16 focus:outline-none"
    >
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6f7b4f]">
        Diong
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">
        We couldn&apos;t find that page
      </h1>
      <p className="mt-3 leading-7 text-[#5f6962]">
        The page may have moved, or the link may be incomplete. Everything you
        have saved is still here.
      </p>
      <div className="mt-7 flex flex-wrap gap-3">
        <Link
          href="/home"
          className="inline-flex min-h-12 items-center rounded-full bg-[#263b2d] px-6 font-semibold text-white hover:bg-[#1d3024]"
        >
          Go to your home
        </Link>
        <Link
          href="/feed"
          className="inline-flex min-h-12 items-center rounded-full border border-[#cfc8bb] px-6 font-semibold text-[#3e4a41] hover:bg-white"
        >
          Go to your feed
        </Link>
      </div>
    </main>
  );
}
