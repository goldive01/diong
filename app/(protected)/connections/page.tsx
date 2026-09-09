import Link from "next/link";
import { requireCompletedProfile } from "@/src/lib/auth";
import {
  getConnectionNudges,
  listConnections,
} from "@/src/lib/connections/connections-data";
import { ConnectionCard } from "@/src/components/connections/connection-card";
import type { ConnectionNudge } from "@/src/types/database";

export const metadata = {
  title: "Connections",
};

const NEEDS_ATTENTION: ConnectionNudge["status"][] = ["due", "never_contacted"];

export default async function ConnectionsPage() {
  const { supabase, userId } = await requireCompletedProfile();
  const [nudges, connections] = await Promise.all([
    getConnectionNudges(supabase),
    listConnections(supabase, userId),
  ]);

  const hasConnections = connections.length > 0;
  const needsAttention = nudges.filter((nudge) =>
    NEEDS_ATTENTION.includes(nudge.status),
  );
  const comingUp = nudges.filter((nudge) => nudge.status === "approaching");
  const upToDate = nudges.filter((nudge) => nudge.status === "up_to_date");

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6f7b4f]">
            Connections
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            The people who matter to your growth
          </h1>
          <p className="mt-3 max-w-2xl text-lg leading-8 text-[#5f6962]">
            A private space to stay intentional about the friends, family,
            mentors, accountability partners, colleagues and collaborators who
            support your development.
          </p>
        </div>
        {hasConnections && (
          <Link
            href="/connections/new"
            className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-[#263b2d] px-5 font-semibold text-white hover:bg-[#1d3024]"
          >
            Add a connection
          </Link>
        )}
      </div>

      {!hasConnections ? (
        <EmptyState />
      ) : nudges.length === 0 ? (
        <section
          role="status"
          className="mt-10 rounded-3xl border border-[#ded7c9] bg-white p-8"
        >
          <h2 className="text-xl font-semibold">
            Connection reminders are unavailable right now
          </h2>
          <p className="mt-2 max-w-xl leading-7 text-[#5f6962]">
            Your connections are saved safely. Please refresh the page to load
            their status again.
          </p>
        </section>
      ) : (
        <div className="mt-10 space-y-10">
          <ConnectionSection
            title="Needs attention"
            description="Worth reaching out to soon."
            nudges={needsAttention}
            emptyText="Nothing needs attention right now."
          />
          <ConnectionSection
            title="Coming up"
            description="Approaching your preferred rhythm."
            nudges={comingUp}
            emptyText="Nothing coming up just yet."
          />
          <ConnectionSection
            title="Up to date"
            description="No action needed."
            nudges={upToDate}
            emptyText="Connections you have contacted recently will appear here."
          />
        </div>
      )}
    </main>
  );
}

function ConnectionSection({
  title,
  description,
  nudges,
  emptyText,
}: {
  title: string;
  description: string;
  nudges: ConnectionNudge[];
  emptyText: string;
}) {
  const headingId = `section-${title.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <section aria-labelledby={headingId}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 id={headingId} className="text-lg font-semibold tracking-tight">
          {title}
        </h2>
        <p className="text-sm text-[#7a8378]">{description}</p>
      </div>
      {nudges.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-[#d8d1c4] px-4 py-6 text-sm text-[#68716b]">
          {emptyText}
        </p>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {nudges.map((nudge) => (
            <ConnectionCard key={nudge.connection_id} nudge={nudge} />
          ))}
        </div>
      )}
    </section>
  );
}

function EmptyState() {
  return (
    <section className="mt-10 rounded-3xl border border-dashed border-[#cfc8bb] p-8 text-center sm:p-14">
      <h2 className="text-2xl font-semibold tracking-tight">
        Keep track of the people who matter to your growth
      </h2>
      <p className="mx-auto mt-3 max-w-xl leading-7 text-[#5f6962]">
        Connections is a private space for the people who support your
        development — friends, family, mentors, accountability partners,
        colleagues, collaborators, study partners and other important people.
        Diong helps you notice when a connection is due for attention and
        suggests one small, purposeful step.
      </p>
      <Link
        href="/connections/new"
        className="mt-7 inline-flex min-h-12 items-center rounded-full bg-[#263b2d] px-6 font-semibold text-white hover:bg-[#1d3024]"
      >
        Add your first connection
      </Link>
    </section>
  );
}
