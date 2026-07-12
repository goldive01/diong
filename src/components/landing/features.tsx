const features = [
  {
    title: "Daily Prime Protocols",
    description:
      "Structured prompts for attention, reflection, motivation, habits and purposeful action.",
  },
  {
    title: "Goals",
    description:
      "Create clear directions and keep your next action close enough to begin.",
  },
  {
    title: "Habit tracking",
    description:
      "Build consistency through simple routines that are easy to return to.",
  },
  {
    title: "Private journal",
    description:
      "Reflect on decisions, progress and lessons in a personal writing space.",
  },
  {
    title: "Progress streaks",
    description:
      "Measure follow-through and momentum without turning growth into pressure.",
  },
  {
    title: "Supportive community",
    description:
      "Share selected progress and encourage others inside a purposeful environment.",
  },
];

export function Features() {
  return (
    <section id="features" className="bg-[#eef1e4]">
      <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6f7b4f]">
            Features
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#1d2420] sm:text-4xl">
            The essentials for a consistent personal growth routine.
          </h2>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-[#d6dcc4] bg-[#fbfaf7] p-6 shadow-sm shadow-[#72805b]/8"
            >
              <div className="mb-5 h-1.5 w-12 rounded-full bg-[#8e9a63]" />
              <h3 className="text-xl font-semibold text-[#202a24]">
                {feature.title}
              </h3>
              <p className="mt-3 text-base leading-7 text-[#566158]">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
