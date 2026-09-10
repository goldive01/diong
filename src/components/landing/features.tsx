const features = [
  {
    title: "Daily Prime",
    description:
      "A short, structured prompt each day for attention, reflection, motivation, habits and purposeful action.",
  },
  {
    title: "Action Trigger",
    description:
      "One concrete, achievable action to complete that day. Progress over intention, and no pressure to do everything.",
  },
  {
    title: "Reflection",
    description:
      "A private space to note what you noticed after the day's practice. Only you can see it.",
  },
  {
    title: "History and progress",
    description:
      "Look back over every Prime you have been assigned, your completion rate and your simple day streaks.",
  },
  {
    title: "Intentional Connections",
    description:
      "Keep track of the friends, family, mentors and collaborators who matter to your growth, and notice when it may be time to reconnect.",
  },
  {
    title: "Chosen for you",
    description:
      "The interests you pick during onboarding shape which Primes you are most likely to receive.",
  },
];

export function Features() {
  return (
    <section id="features" className="bg-[#eef1e4]">
      <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6f7b4f]">
            What Diong gives you
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#1d2420] sm:text-4xl">
            A calm, structured routine for turning intention into progress.
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
