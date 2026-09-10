import Link from "next/link";
import { DailyPrimeCard } from "@/src/components/prime/daily-prime-card";
import { PrimeReflectionForm } from "@/src/components/prime/prime-reflection-form";
import { requireCompletedProfile } from "@/src/lib/auth";
import { getDailyPrime, getPrimeReflection } from "@/src/lib/prime-data";
import { savePrimeReflection } from "@/app/(protected)/daily-prime/actions";
import { DEFAULT_REFLECTION_PROMPT } from "@/src/lib/prime-reflection";

export default async function DailyPrimePage() {
  const { supabase, userId, profile } = await requireCompletedProfile();
  const result = await getDailyPrime(supabase);
  const reflection =
    result.status === "ready" && result.prime.completed_at
      ? await getPrimeReflection(supabase, userId, result.prime.assignment_id)
      : null;
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
        <Link
          href="/daily-prime/history"
          className="mt-4 inline-block text-sm font-semibold text-[#59654a] hover:underline"
        >
          View Prime history
        </Link>
      </header>

      {result.status === "ready" ? (
        <div className="space-y-8">
          <DailyPrimeCard prime={result.prime} />
          {result.prime.completed_at && (
            <PrimeReflectionForm
              action={savePrimeReflection.bind(null, result.prime.assignment_id)}
              prompt={result.prime.reflection_prompt ?? DEFAULT_REFLECTION_PROMPT}
              initialReflection={reflection ?? ""}
            />
          )}
        </div>
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
