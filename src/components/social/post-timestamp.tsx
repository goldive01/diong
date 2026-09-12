"use client";

import { formatPostTimestamp } from "@/src/lib/social/post-labels";

const ABSOLUTE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

// A calm relative label ("3 hours ago"), falling back to an absolute date past a
// week. The relative value is computed at render against the current clock, so
// the server and client can differ by a second or two — `suppressHydrationWarning`
// on the <time> element covers that expected, harmless text difference.
export function PostTimestamp({
  iso,
  edited = false,
  className,
}: {
  iso: string;
  edited?: boolean;
  className?: string;
}) {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return null;

  const absolute = ABSOLUTE.format(new Date(parsed));

  return (
    <time
      dateTime={iso}
      title={absolute}
      className={className}
      suppressHydrationWarning
    >
      {formatPostTimestamp(iso)}
      {edited && <span className="text-[#8b9384]"> · edited</span>}
    </time>
  );
}
