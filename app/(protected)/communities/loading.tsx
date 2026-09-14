import { LoadingStatus, SkeletonBlock, SkeletonCard, SkeletonLine } from "@/src/components/app/loading-skeleton";

// Mirrors communities/page.tsx: header, "your communities" list, "discover"
// list — both rendered as stacked rows of the same community-card shape.
export default function Loading() {
  return (
    <LoadingStatus className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-6 sm:py-14">
      <SkeletonLine className="h-3 w-28" />
      <SkeletonBlock className="mt-3 h-9 w-2/3 max-w-md" />

      <SkeletonLine className="mt-10 h-5 w-40" />
      <div className="mt-4 space-y-3">
        <SkeletonCard className="h-20" />
        <SkeletonCard className="h-20" />
      </div>

      <SkeletonLine className="mt-10 h-5 w-40" />
      <div className="mt-4 space-y-3">
        <SkeletonCard className="h-20" />
        <SkeletonCard className="h-20" />
      </div>
    </LoadingStatus>
  );
}
