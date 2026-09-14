import { LoadingStatus, SkeletonBlock, SkeletonCard, SkeletonLine } from "@/src/components/app/loading-skeleton";

// Mirrors home/page.tsx's shape: label + heading + username, a two-column
// "Today" / "Interests" section, then two more full-width sections.
export default function Loading() {
  return (
    <LoadingStatus className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-6 sm:py-14">
      <SkeletonLine className="h-3 w-24" />
      <SkeletonBlock className="mt-4 h-10 w-3/4 max-w-md" />
      <SkeletonLine className="mt-3 h-4 w-32" />

      <div className="mt-10 grid gap-5 md:grid-cols-[1.2fr_0.8fr]">
        <SkeletonCard className="h-52" />
        <SkeletonCard className="h-52" />
      </div>

      <SkeletonCard className="mt-6 h-40" />
      <SkeletonCard className="mt-6 h-32" />
    </LoadingStatus>
  );
}
