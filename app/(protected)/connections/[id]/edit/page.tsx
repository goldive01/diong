import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCompletedProfile } from "@/src/lib/auth";
import { getConnection } from "@/src/lib/connections/connections-data";
import { ConnectionForm } from "@/src/components/connections/connection-form";
import { updateConnection } from "@/app/(protected)/connections/[id]/actions";
import type { ConnectionFormValues } from "@/src/lib/connections/connection-form-state";

export const metadata = {
  title: "Edit connection",
};

export default async function EditConnectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase, userId } = await requireCompletedProfile();
  const { id } = await params;

  const connection = await getConnection(supabase, userId, Number(id));
  if (!connection) notFound();

  const initialValues: ConnectionFormValues = {
    name: connection.name,
    connectionType: connection.connection_type,
    connectionPurpose: connection.connection_purpose,
    whyItMatters: connection.why_it_matters ?? "",
    preferredContactDays:
      connection.preferred_contact_days === null
        ? ""
        : String(connection.preferred_contact_days),
    notes: connection.notes ?? "",
  };

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-6 sm:py-14">
      <Link
        href={`/connections/${connection.id}`}
        className="text-sm font-semibold text-[#59654a] hover:underline"
      >
        ← Back to {connection.name}
      </Link>

      <section className="mt-4 rounded-3xl border border-[#ded7c9] bg-white p-6 sm:p-9">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6f7b4f]">
          Connections
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Edit connection
        </h1>
        <p className="mt-2 leading-7 text-[#5f6962]">
          Update the details for this connection. Its interaction history and
          last-contact date are not affected.
        </p>

        <ConnectionForm
          action={updateConnection.bind(null, connection.id)}
          initialValues={initialValues}
          submitLabel="Save changes"
          pendingLabel="Saving…"
          cancelHref={`/connections/${connection.id}`}
        />
      </section>
    </main>
  );
}
