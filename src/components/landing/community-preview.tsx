export function CommunityPreview() {
  return (
    <section id="community" className="bg-[#26302a] text-white">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-24">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#dfe6bf]">
            Community
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Progress feels steadier when encouragement is part of the rhythm.
          </h2>
        </div>
        <div className="rounded-[1.5rem] border border-white/12 bg-white/8 p-6 shadow-2xl shadow-black/15 sm:p-8">
          <p className="text-lg leading-8 text-[#eef1ea]">
            Diong is designed so members can share selected progress, celebrate
            milestones and encourage others in a supportive environment. The
            community experience is about accountability, kindness and momentum,
            without fake posts, inflated statistics or performative pressure.
          </p>
        </div>
      </div>
    </section>
  );
}
