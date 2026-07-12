const protocolDetails = [
  {
    label: "Purpose",
    value: "Build the habit of showing up even when motivation changes.",
  },
  {
    label: "Best time",
    value: "Morning before beginning your most important task.",
  },
  {
    label: "Action Trigger",
    value:
      "Begin your most important task and continue for ten uninterrupted minutes.",
  },
  {
    label: "Tomorrow's Expectation",
    value:
      "Beginning will feel more familiar tomorrow because you practised showing up today.",
  },
  {
    label: "Reflection Prompt",
    value:
      "What action did you complete today that proved you can rely on yourself?",
  },
];

export function PrimeProtocolCard() {
  return (
    <article className="overflow-hidden rounded-[1.5rem] border border-[#d8d0c1] bg-[#fbfaf7] shadow-2xl shadow-[#756b5b]/12">
      <div className="border-b border-[#e4ded2] bg-white px-6 py-7 sm:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6f7b4f]">
          Consistency
        </p>
        <h3 className="mt-2 text-3xl font-semibold tracking-tight text-[#1d2420]">
          Consistency Prime Protocol
        </h3>
      </div>
      <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="border-b border-[#e4ded2] p-6 sm:p-8 lg:border-b-0 lg:border-r">
          <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6f7b4f]">
            Prime
          </h4>
          <p className="mt-4 text-xl leading-9 text-[#27302a]">
            You do not need perfect motivation to make meaningful progress.
            Every small action strengthens your ability to follow through.
            Today, you choose progress over waiting, and purposeful action over
            perfection.
          </p>
        </div>
        <dl className="divide-y divide-[#e4ded2]">
          {protocolDetails.map((detail) => (
            <div key={detail.label} className="p-6 sm:px-8">
              <dt className="text-sm font-semibold text-[#3e4a41]">
                {detail.label}
              </dt>
              <dd className="mt-2 text-base leading-7 text-[#5a655c]">
                {detail.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </article>
  );
}
