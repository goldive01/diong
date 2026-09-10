// Lightweight route-transition skeleton for the authenticated area. Matches the
// standard page container and card language; deliberately minimal animation.
export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-6 sm:py-14"
    >
      <div className="h-3 w-28 animate-pulse rounded-full bg-[#e2ddd0]" />
      <div className="mt-4 h-10 w-3/4 max-w-md animate-pulse rounded-2xl bg-[#e2ddd0]" />
      <div className="mt-8 space-y-4">
        <div className="h-40 animate-pulse rounded-3xl border border-[#ded7c9] bg-white" />
        <div className="h-40 animate-pulse rounded-3xl border border-[#ded7c9] bg-white" />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
