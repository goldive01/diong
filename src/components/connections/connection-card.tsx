import Link from "next/link";
import type { ConnectionNudge } from "@/src/types/database";
import {
  CONNECTION_PURPOSE_LABEL,
  CONNECTION_TYPE_LABEL,
  NUDGE_STATUS_LABEL,
  describeContactRhythm,
  describeLastMeaningfulContact,
  suggestedConnectionAction,
} from "@/src/lib/connections/connection-labels";

// A restrained card. Shows only what helps the user act. No notes, no scores,
// no charts. Status is always shown as text (never colour alone). The whole
// card links to the connection's detail page.
export function ConnectionCard({ nudge }: { nudge: ConnectionNudge }) {
  const action = suggestedConnectionAction({
    connectionType: nudge.connection_type,
    status: nudge.status,
  });

  return (
    <Link
      href={`/connections/${nudge.connection_id}`}
      className="block rounded-3xl border border-[#ded7c9] bg-white p-5 outline-none transition hover:border-[#b9c3a3] focus-visible:ring-2 focus-visible:ring-[#6f7b4f]/30 sm:p-6"
    >
      <article>
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-[#1d2420]">
              {nudge.name}
            </h3>
            <p className="mt-1 text-sm text-[#5f6962]">
              {CONNECTION_TYPE_LABEL[nudge.connection_type]}
              <span aria-hidden="true"> · </span>
              {CONNECTION_PURPOSE_LABEL[nudge.connection_purpose]}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-[#eef2e5] px-3 py-1 text-xs font-semibold text-[#3e4a41]">
            {NUDGE_STATUS_LABEL[nudge.status]}
          </span>
        </div>

        <dl className="mt-4 space-y-1 text-sm text-[#5a655c]">
          <div>
            <dt className="sr-only">Last meaningful contact</dt>
            <dd>{describeLastMeaningfulContact(nudge.days_since)}</dd>
          </div>
          {nudge.preferred_contact_days !== null && (
            <div>
              <dt className="sr-only">Preferred rhythm</dt>
              <dd>
                Rhythm: {describeContactRhythm(nudge.preferred_contact_days)}
              </dd>
            </div>
          )}
        </dl>

        {action && (
          <div className="mt-4 rounded-2xl bg-[#f7f4ee] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6f7b4f]">
              Suggested action
            </p>
            <p className="mt-1 text-sm leading-6 text-[#3e4a41]">{action}</p>
          </div>
        )}
      </article>
    </Link>
  );
}
