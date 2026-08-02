import { CompletePrimeButton } from "@/src/components/prime/complete-prime-button";
import type { DailyPrime } from "@/src/types/database";

type Detail = {
  label: string;
  value: string | null;
};

export function DailyPrimeCard({ prime }: { prime: DailyPrime }) {
  const details: Detail[] = [
    { label: "Purpose", value: prime.purpose },
    { label: "Best time", value: prime.best_time },
    { label: "Tomorrow's expectation", value: prime.tomorrows_expectation },
    { label: "Reflection prompt", value: prime.reflection_prompt },
  ];

  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-[#d8d0c1] bg-[#fbfaf7] shadow-xl shadow-[#756b5b]/10">
      <header className="border-b border-[#e4ded2] bg-white px-6 py-7 sm:px-9 sm:py-9">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6f7b4f]">
          {prime.category_name}
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#1d2420] sm:text-4xl">
          {prime.title}
        </h2>
      </header>

      <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
        <section className="border-b border-[#e4ded2] p-6 sm:p-9 lg:border-r lg:border-b-0">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6f7b4f]">
            Prime
          </p>
          <p className="mt-4 text-xl leading-9 text-[#27302a]">
            {prime.prime_text}
          </p>
        </section>

        <dl className="divide-y divide-[#e4ded2]">
          {details
            .filter((detail): detail is { label: string; value: string } =>
              Boolean(detail.value),
            )
            .map((detail) => (
              <div key={detail.label} className="p-6 sm:px-9">
                <dt className="text-sm font-semibold text-[#3e4a41]">
                  {detail.label}
                </dt>
                <dd className="mt-2 leading-7 text-[#5a655c]">{detail.value}</dd>
              </div>
            ))}
        </dl>
      </div>

      <section className="border-t border-[#d7dfcf] bg-[#eef2e5] p-6 sm:p-9">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#5d704b]">
          Action Trigger
        </p>
        <p className="mt-3 max-w-3xl text-lg font-medium leading-8 text-[#26352b]">
          {prime.action_trigger}
        </p>
        {prime.completed_at ? (
          <div
            role="status"
            className="mt-6 inline-flex min-h-12 items-center rounded-full border border-[#aebda2] bg-white px-5 font-semibold text-[#47604a]"
          >
            Completed today
          </div>
        ) : (
          <CompletePrimeButton assignmentId={prime.assignment_id} />
        )}
      </section>
    </article>
  );
}
