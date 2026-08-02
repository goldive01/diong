import { DailyPrimeCard } from "@/src/components/prime/daily-prime-card";
import { requireCompletedProfile } from "@/src/lib/auth";
import { getDailyPrime } from "@/src/lib/prime-data";

export default async function DailyPrimePage() {
  const { supabase, profile } = await requireCompletedProfile();
  const result = await getDailyPrime(supabase);
  const today = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-6 sm:py-14">
      <header className="mb-8 sm:mb-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6f7b4f]">
          {today}
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          Your Daily Prime
        </h1>
        <p className="mt-3 max-w-2xl text-lg leading-8 text-[#5f6962]">
          A focused prompt for attention, reflection and purposeful action,
          chosen for {profile.display_name}.
        </p>
      </header>

      {result.status === "ready" ? (
        <DailyPrimeCard prime={result.prime} />
      ) : (
        <section
          role={result.status === "error" ? "alert" : "status"}
          className="rounded-3xl border border-[#ded7c9] bg-white p-8 sm:p-10"
        >
          <h2 className="text-2xl font-semibold">
            {result.status === "error"
              ? "Your Daily Prime is unavailable"
              : "No Daily Prime is available today"}
          </h2>
          <p className="mt-3 max-w-xl leading-7 text-[#5f6962]">
            {result.status === "error"
              ? "We could not load your protocol. Please refresh the page and try again."
              : "There is no published protocol to assign right now. Please check back later."}
          </p>
        </section>
      )}
    </main>
  );
}
