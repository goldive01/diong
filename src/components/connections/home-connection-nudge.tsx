import Link from "next/link";
import type { ConnectionNudge } from "@/src/types/database";
import {
  CONNECTION_PURPOSE_LABEL,
  CONNECTION_TYPE_LABEL,
  describeLastMeaningfulContact,
  nudgeReconnectPrompt,
  suggestedConnectionAction,
} from "@/src/lib/connections/connection-labels";

// The single Connections prompt shown on /home, beneath the Daily Prime content.
// A server component: no interactivity, no client bundle. It renders only the
// minimal, non-private nudge information — never notes, never interaction
// history. Status and ordering come entirely from get_connection_nudges();
// nothing here re-scores or re-sorts.
export function HomeConnectionNudge({
  nudge,
}: {
  nudge: ConnectionNudge | null;
}) {
  if (!nudge) {
    return (
      <article className="rounded-3xl border border-[#ded7c9] bg-white p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6f7b4f]">
          Connections
        </p>
        <p className="mt-3 max-w-xl leading-7 text-[#5f6962]">
          Your important connections are up to date.
        </p>
        <Link
          href="/connections"
          className="mt-4 inline-block font-medium text-[#59654a] hover:underline"
        >
          View all connections
        </Link>
      </article>
    );
  }

  const prompt = nudgeReconnectPrompt(nudge.status);
  const action = suggestedConnectionAction({
    connectionType: nudge.connection_type,
    status: nudge.status,
  });

  return (
    <article className="rounded-3xl border border-[#ded7c9] bg-white p-6 sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6f7b4f]">
        Connection
      </p>
      <h2 className="mt-3 text-2xl font-semibold">Connection worth revisiting</h2>

      <div className="mt-4">
        <p className="text-lg font-semibold text-[#1d2420]">{nudge.name}</p>
        <p className="mt-1 text-sm text-[#5f6962]">
          {CONNECTION_TYPE_LABEL[nudge.connection_type]}
          <span aria-hidden="true"> · </span>
          {CONNECTION_PURPOSE_LABEL[nudge.connection_purpose]}
        </p>
      </div>

      {prompt && (
        <p className="mt-4 max-w-xl leading-7 text-[#4f5952]">{prompt}</p>
      )}
      <p className="mt-1 text-sm text-[#7a8378]">
        {describeLastMeaningfulContact(nudge.days_since)}
      </p>

      {action && (
        <div className="mt-4 max-w-xl rounded-2xl bg-[#f7f4ee] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6f7b4f]">
            Suggested action
          </p>
          <p className="mt-1 text-sm leading-6 text-[#3e4a41]">{action}</p>
        </div>
      )}

      <Link
        href={`/connections/${nudge.connection_id}`}
        className="mt-5 inline-flex min-h-11 items-center rounded-full bg-[#263b2d] px-5 font-semibold text-white hover:bg-[#1d3024]"
      >
        View connection
      </Link>
    </article>
  );
}
