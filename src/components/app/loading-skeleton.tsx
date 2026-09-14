// Shared building blocks for route loading.tsx skeletons. Deliberately
// generic shapes (bars/blocks/cards) rather than anything that could read as
// real content — a skeleton must never imitate an actual username, post
// body or count. Colors/radii match app/(protected)/loading.tsx, the
// existing shared fallback these compose alongside.

export function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-full bg-[#e2ddd0] ${className}`} />;
}

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-[#e2ddd0] ${className}`} />;
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-3xl border border-[#ded7c9] bg-white ${className}`} />
  );
}

// Wraps a route skeleton with the accessible status semantics every
// loading.tsx needs: aria-busy via role="status", a label for assistive
// tech, and an sr-only text fallback for anyone whose screen reader doesn't
// surface the label. Visible skeleton content stays aria-hidden so it is
// never announced shape-by-shape.
export function LoadingStatus({
  children,
  label = "Loading",
  className = "mx-auto w-full max-w-5xl px-5 py-10 sm:px-6 sm:py-14",
}: {
  children: React.ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <div role="status" aria-label={label} className={className}>
      <div aria-hidden="true">{children}</div>
      <span className="sr-only">{label}…</span>
    </div>
  );
}
