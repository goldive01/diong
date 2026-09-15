import { LoadingStatus, SkeletonBlock, SkeletonCard, SkeletonLine } from "@/src/components/app/loading-skeleton";

// Mirrors this route's own page.tsx (cover image, avatar + name row, then a
// stack of posts) rather than the shape of the sibling communities/loading.tsx
// list skeleton it would otherwise inherit — release-quality fix for the
// skeleton-shape mismatch documented in docs/UX_RELIABILITY_ACCESSIBILITY.md.
export default function Loading() {
  return (
    <LoadingStatus className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-6 sm:py-14">
      <SkeletonLine className="h-4 w-36" />

      <div className="mt-4 overflow-hidden rounded-3xl border border-[#ded7c9] bg-white">
        <SkeletonBlock className="aspect-[3/1] w-full rounded-none sm:aspect-[4/1]" />
        <div className="p-6 sm:p-9">
          <SkeletonLine className="-mt-10 size-14 rounded-full sm:-mt-12" />
          <SkeletonBlock className="mt-4 h-7 w-2/3 max-w-xs" />
          <SkeletonLine className="mt-2 h-3.5 w-40" />
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <SkeletonCard className="h-32" />
        <SkeletonCard className="h-32" />
      </div>
    </LoadingStatus>
  );
}
