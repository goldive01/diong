import Link from "next/link";
import { requireCompletedProfile } from "@/src/lib/auth";
import { ConnectionForm } from "@/src/components/connections/connection-form";
import { createConnection } from "@/app/(protected)/connections/actions";

export const metadata = {
  title: "Add a connection",
};

export default async function NewConnectionPage() {
  await requireCompletedProfile();

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-6 sm:py-14">
      <Link
        href="/connections"
        className="text-sm font-semibold text-[#59654a] hover:underline"
      >
        ← Back to Connections
      </Link>

      <section className="mt-4 rounded-3xl border border-[#ded7c9] bg-white p-6 sm:p-9">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6f7b4f]">
          Connections
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Add a connection
        </h1>
        <p className="mt-2 leading-7 text-[#5f6962]">
          Add someone who matters to your growth. You can update these details
          later.
        </p>

        <ConnectionForm action={createConnection} />
      </section>
    </main>
  );
}
