import { LoadingStatus, SkeletonBlock, SkeletonCard, SkeletonLine } from "@/src/components/app/loading-skeleton";

// Mirrors discover/page.tsx: header, a row of people cards, a 2-col grid of
// community cards, then a stack of post cards.
export default function Loading() {
  return (
    <LoadingStatus className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-6 sm:py-14">
      <SkeletonLine className="h-3 w-20" />
      <SkeletonBlock className="mt-3 h-9 w-full max-w-md" />
      <SkeletonLine className="mt-3 h-4 w-2/3" />

      <div className="mt-10 flex gap-3">
        <SkeletonCard className="h-24 w-40 shrink-0" />
        <SkeletonCard className="h-24 w-40 shrink-0" />
        <SkeletonCard className="h-24 w-40 shrink-0" />
      </div>

      <div className="mt-10 grid gap-3 sm:grid-cols-2">
        <SkeletonCard className="h-20" />
        <SkeletonCard className="h-20" />
      </div>

      <div className="mt-10 space-y-3">
        <SkeletonCard className="h-32" />
        <SkeletonCard className="h-32" />
      </div>
    </LoadingStatus>
  );
}
