import Link from "next/link";
import type { CommunityModerationReport } from "@/src/lib/communities/community-data";
import { REPORT_REASON_LABEL } from "@/src/lib/communities/report-validation";

// Report queue for /communities/[slug]/moderation. Reporter identity is never
// rendered — the RPC this reads from does not even select it. This is a view
// only; changing a report's status is platform-admin functionality, deferred
// past Pass 5 (see docs/COMMUNITIES_MODERATION.md).
export function CommunityModerationReports({
  reports,
}: {
  reports: CommunityModerationReport[];
}) {
  if (reports.length === 0) {
    return <p className="text-sm text-[#68716b]">No reports for this community.</p>;
  }

  return (
    <ul className="divide-y divide-[#ece7de] rounded-2xl border border-[#e0dacd] bg-white">
      {reports.map((report) => (
        <li key={report.id} className="px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[#1d2420]">
              {REPORT_REASON_LABEL[report.reason]}
              <span className="ml-2 font-normal text-[#657052]">
                {report.targetType === "community_post" ? "community post" : "community"}
              </span>
            </p>
            <span className="rounded-full border border-[#cfc8bb] px-2 py-0.5 text-xs font-semibold text-[#4d574f]">
              {report.status}
            </span>
          </div>
          {report.details && (
            <p className="mt-1 text-sm leading-6 text-[#5f6962]">{report.details}</p>
          )}
          {report.targetType === "community_post" && (
            <Link
              href={`/posts/${report.targetId}`}
              className="mt-1 inline-block text-sm font-semibold text-[#59654a] hover:underline"
            >
              View post
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
