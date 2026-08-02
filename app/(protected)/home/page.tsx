import Link from "next/link";
import { requireCompletedProfile } from "@/src/lib/auth";
import { getInterestNames } from "@/src/lib/profile-data";

export default async function HomePage() {
  const { supabase, userId, profile } = await requireCompletedProfile();
  const interestNames = await getInterestNames(supabase, userId);

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-6 sm:py-14">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6f7b4f]">Your home</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Welcome, {profile.display_name}</h1>
      <Link href={`/profile/${profile.username}`} className="mt-3 inline-block font-medium text-[#59654a] hover:underline">@{profile.username}</Link>

      <section className="mt-10 grid gap-5 md:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-3xl border border-[#ded7c9] bg-white p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6f7b4f]">Today</p>
          <h2 className="mt-3 text-2xl font-semibold">Your Daily Prime</h2>
          <p className="mt-3 max-w-xl leading-7 text-[#5f6962]">Prepare your attention, reflect on what matters and take one purposeful action.</p>
          <Link href="/daily-prime" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-[#263b2d] px-5 font-semibold text-white hover:bg-[#1d3024]">Open today&apos;s Prime</Link>
        </article>
        <aside className="rounded-3xl border border-[#ded7c9] bg-[#eef2e5] p-6 sm:p-8">
          <h2 className="text-lg font-semibold">Your interests</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {interestNames.map((name) => <li key={name} className="rounded-full bg-white px-3 py-1.5 text-sm font-medium">{name}</li>)}
          </ul>
        </aside>
      </section>
    </main>
  );
}
