import Link from "next/link";
import { requireCompletedProfile } from "@/src/lib/auth";
import { getPrimeProgress, listPrimeHistory } from "@/src/lib/prime-data";
import { PrimeHistoryList } from "@/src/components/prime/prime-history-list";
import { PrimeProgressSummary } from "@/src/components/prime/prime-progress-summary";

export const metadata = {
  title: "Prime history",
};

export default async function PrimeHistoryPage() {
  const { supabase, userId } = await requireCompletedProfile();
  const [items, progress] = await Promise.all([
    listPrimeHistory(supabase, userId),
    getPrimeProgress(supabase, userId),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-6 sm:py-14">
      <Link
        href="/daily-prime"
        className="text-sm font-semibold text-[#59654a] hover:underline"
      >
        ← Back to Daily Prime
      </Link>

      <header className="mt-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6f7b4f]">
          Daily Prime
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
          Your Prime history
        </h1>
        <p className="mt-3 max-w-2xl text-lg leading-8 text-[#5f6962]">
          Every Prime you have been assigned, newest first, and what you
          reflected on.
        </p>
      </header>

      {items.length === 0 ? (
        <section className="mt-10 rounded-3xl border border-dashed border-[#cfc8bb] p-8 text-center sm:p-14">
          <h2 className="text-2xl font-semibold tracking-tight">
            Your Prime journey starts with today&apos;s practice.
          </h2>
          <Link
            href="/daily-prime"
            className="mt-7 inline-flex min-h-12 items-center rounded-full bg-[#263b2d] px-6 font-semibold text-white hover:bg-[#1d3024]"
          >
            Open today&apos;s Prime
          </Link>
        </section>
      ) : (
        <div className="mt-10 space-y-8">
          <PrimeProgressSummary progress={progress} />
          <section aria-labelledby="prime-history-heading">
            <h2
              id="prime-history-heading"
              className="text-lg font-semibold tracking-tight"
            >
              History
            </h2>
            <div className="mt-4">
              <PrimeHistoryList items={items} />
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
