const steps = [
  "Choose your direction.",
  "Receive a daily Prime Protocol.",
  "Complete one focused Action Trigger.",
  "Reflect and track your progress.",
  "Grow with a supportive community.",
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-6 lg:px-8 lg:py-24"
    >
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6f7b4f]">
          How Diong works
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#1d2420] sm:text-4xl">
          A calm rhythm for turning intention into progress.
        </h2>
      </div>
      <ol className="mt-10 grid gap-4 md:grid-cols-5">
        {steps.map((step, index) => (
          <li
            key={step}
            className="rounded-2xl border border-[#ded7c9] bg-white/72 p-5 shadow-sm shadow-[#756b5b]/8"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e2e9c7] text-sm font-bold text-[#36402d]">
              {index + 1}
            </span>
            <p className="mt-5 text-base font-semibold leading-6 text-[#26302a]">
              {step}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
