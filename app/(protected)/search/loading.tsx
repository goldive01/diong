import { LoadingStatus, SkeletonBlock, SkeletonLine } from "@/src/components/app/loading-skeleton";

// Mirrors search/page.tsx: header + search field, then People/Posts/
// Communities section labels with a couple of placeholder rows each.
export default function Loading() {
  return (
    <LoadingStatus className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-6 sm:py-14">
      <SkeletonLine className="h-3 w-16" />
      <SkeletonBlock className="mt-3 h-9 w-2/3 max-w-md" />
      <SkeletonBlock className="mt-6 h-11 w-full" />

      {["People", "Posts", "Communities"].map((section) => (
        <div key={section} className="mt-10">
          <SkeletonLine className="h-4 w-24" />
          <div className="mt-4 space-y-3">
            <SkeletonBlock className="h-16" />
            <SkeletonBlock className="h-16" />
          </div>
        </div>
      ))}
    </LoadingStatus>
  );
}
