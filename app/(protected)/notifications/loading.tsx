import { LoadingStatus, SkeletonBlock, SkeletonLine } from "@/src/components/app/loading-skeleton";

// Mirrors notifications/page.tsx: header, then a flat list of notification
// rows (each just an avatar-sized dot + two text lines, no card border —
// the real rows are borderless too).
export default function Loading() {
  return (
    <LoadingStatus className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-6 sm:py-14">
      <SkeletonLine className="h-3 w-28" />
      <SkeletonBlock className="mt-3 h-9 w-2/3 max-w-md" />

      <div className="mt-8 space-y-5">
        {[0, 1, 2, 3, 4].map((row) => (
          <div key={row} className="flex items-start gap-3">
            <SkeletonLine className="size-9 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <SkeletonLine className="h-3.5 w-3/4" />
              <SkeletonLine className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </LoadingStatus>
  );
}
