import Link from "next/link";
import { requireCompletedProfile } from "@/src/lib/auth";
import { CommunityForm } from "@/src/components/communities/community-form";
import { createCommunityAction } from "@/app/(protected)/communities/new/actions";

export const metadata = {
  title: "New community",
};

export default async function NewCommunityPage() {
  await requireCompletedProfile();

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-6 sm:py-14">
      <Link
        href="/communities"
        className="text-sm font-semibold text-[#59654a] hover:underline"
      >
        ← Back to Communities
      </Link>

      <section className="mt-4 rounded-3xl border border-[#ded7c9] bg-white p-6 sm:p-9">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6f7b4f]">
          Communities
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Start a community
        </h1>
        <p className="mt-2 leading-7 text-[#5f6962]">
          Communities are public — any signed-in member can read and join. You
          become the owner automatically.
        </p>

        <CommunityForm action={createCommunityAction} />
      </section>
    </main>
  );
}
