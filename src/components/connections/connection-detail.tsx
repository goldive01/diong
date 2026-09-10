import Link from "next/link";
import type { ConnectionDetail as ConnectionDetailData } from "@/src/lib/connections/connections-data";
import {
  CONNECTION_PURPOSE_LABEL,
  CONNECTION_TYPE_LABEL,
  describeContactRhythm,
  describeLastContactMoment,
} from "@/src/lib/connections/connection-labels";
import {
  deactivateConnection,
  reactivateConnection,
  recordInteraction,
} from "@/app/(protected)/connections/[id]/actions";
import { RecordInteractionForm } from "@/src/components/connections/record-interaction-form";
import { InteractionHistory } from "@/src/components/connections/interaction-history";
import { ConnectionActiveToggle } from "@/src/components/connections/connection-active-toggle";

type DetailRow = { label: string; value: string };

export function ConnectionDetail({
  connection,
}: {
  connection: ConnectionDetailData;
}) {
  const rows: DetailRow[] = [
    { label: "Type", value: CONNECTION_TYPE_LABEL[connection.connection_type] },
    {
      label: "Supports",
      value: CONNECTION_PURPOSE_LABEL[connection.connection_purpose],
    },
    {
      label: "Preferred rhythm",
      value: describeContactRhythm(connection.preferred_contact_days),
    },
    {
      label: "Last meaningful contact",
      value: describeLastContactMoment(connection.last_meaningful_contact_at),
    },
  ];

  const activeToggle = connection.is_active
    ? { isActive: true, action: deactivateConnection.bind(null, connection.id) }
    : {
        isActive: false,
        action: reactivateConnection.bind(null, connection.id),
      };

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-6 sm:py-14">
      <Link
        href="/connections"
        className="text-sm font-semibold text-[#59654a] hover:underline"
      >
        ← Back to Connections
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">
              {connection.name}
            </h1>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                connection.is_active
                  ? "bg-[#eef2e5] text-[#3e4a41]"
                  : "bg-[#efe7dd] text-[#6b5b45]"
              }`}
            >
              {connection.is_active ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
        <Link
          href={`/connections/${connection.id}/edit`}
          className="min-h-11 shrink-0 rounded-full border border-[#cfc8bb] px-5 py-2.5 text-sm font-semibold text-[#3e4a41] hover:bg-white"
        >
          Edit
        </Link>
      </div>

      <section className="mt-6 rounded-3xl border border-[#ded7c9] bg-white p-6 sm:p-7">
        <dl className="divide-y divide-[#ece7de]">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0"
            >
              <dt className="text-sm font-semibold text-[#3e4a41]">
                {row.label}
              </dt>
              <dd className="text-sm text-[#5a655c] sm:text-right">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>

        {connection.why_it_matters && (
          <div className="mt-4 border-t border-[#ece7de] pt-4">
            <p className="text-sm font-semibold text-[#3e4a41]">
              Why this person matters
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#4f5952]">
              {connection.why_it_matters}
            </p>
          </div>
        )}

        <div className="mt-4 border-t border-[#ece7de] pt-4">
          <p className="text-sm font-semibold text-[#3e4a41]">Private notes</p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#4f5952]">
            {connection.notes ? connection.notes : "No notes yet."}
          </p>
        </div>
      </section>

      <section
        aria-labelledby="record-heading"
        className="mt-8 rounded-3xl border border-[#ded7c9] bg-white p-6 sm:p-7"
      >
        <h2 id="record-heading" className="text-lg font-semibold tracking-tight">
          Record a meaningful interaction
        </h2>
        <p className="mt-1 mb-5 text-sm leading-6 text-[#5f6962]">
          Logging a real conversation, message or meeting updates when this
          connection was last in touch.
        </p>
        <RecordInteractionForm
          action={recordInteraction.bind(null, connection.id)}
        />
      </section>

      <section
        aria-labelledby="history-heading"
        className="mt-8"
      >
        <h2
          id="history-heading"
          className="text-lg font-semibold tracking-tight"
        >
          Interaction history
        </h2>
        <p className="mt-1 mb-4 text-sm text-[#7a8378]">
          Most recent first. Interactions cannot be edited or deleted.
        </p>
        <InteractionHistory interactions={connection.interactions} />
      </section>

      <section
        aria-labelledby="active-heading"
        className="mt-8 rounded-3xl border border-[#ded7c9] bg-white p-6 sm:p-7"
      >
        <h2 id="active-heading" className="text-lg font-semibold tracking-tight">
          {connection.is_active ? "Active connection" : "Inactive connection"}
        </h2>
        <div className="mt-3">
          <ConnectionActiveToggle
            key={connection.is_active ? "active" : "inactive"}
            isActive={activeToggle.isActive}
            action={activeToggle.action}
          />
        </div>
      </section>
    </main>
  );
}
