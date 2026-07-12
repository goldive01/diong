export function Hero() {
  return (
    <section
      id="top"
      className="relative overflow-hidden border-b border-[#ded7c9]"
    >
      <div className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top_left,_rgba(124,144,93,0.22),_transparent_36%),radial-gradient(circle_at_top_right,_rgba(75,103,117,0.16),_transparent_34%)]" />
      <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-5 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:py-24">
        <div className="flex flex-col justify-center">
          <p className="mb-5 inline-flex w-fit rounded-full border border-[#cfc7b8] bg-white/60 px-4 py-2 text-sm font-semibold text-[#53613f] shadow-sm">
            Daily structure for purposeful growth
          </p>
          <h1 className="max-w-4xl text-5xl font-semibold leading-[1.02] tracking-tight text-[#1d2420] sm:text-6xl lg:text-7xl">
            Prime your mind. Act on your goals. Become more.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#4f5b53] sm:text-xl">
            Diong combines structured daily priming, meaningful action, goal
            tracking, journaling and community support to help people build
            consistent personal growth routines.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="#start"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#1d2420] px-7 text-base font-semibold text-white shadow-lg shadow-[#1d2420]/20 transition hover:bg-[#2f3a34] focus:outline-none focus:ring-2 focus:ring-[#1d2420] focus:ring-offset-2 focus:ring-offset-[#f7f4ee]"
            >
              Start free
            </a>
            <a
              href="#how-it-works"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#bfb7a8] bg-white/70 px-7 text-base font-semibold text-[#27302a] transition hover:border-[#8e9870] hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#8e9870] focus:ring-offset-2 focus:ring-offset-[#f7f4ee]"
            >
              See how it works
            </a>
          </div>
        </div>
        <div className="relative">
          <div className="rounded-[2rem] border border-[#d8d0c1] bg-white/78 p-5 shadow-2xl shadow-[#756b5b]/12 backdrop-blur">
            <div className="rounded-[1.4rem] bg-[#1f2a25] p-6 text-white">
              <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                  <p className="text-sm uppercase tracking-[0.18em] text-[#c8d0a8]">
                    Today
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">
                    Focused action
                  </h2>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#dfe6bf] text-lg font-bold text-[#243027]">
                  10
                </div>
              </div>
              <div className="space-y-4 py-6">
                {["Choose direction", "Read protocol", "Act for ten minutes"].map(
                  (item, index) => (
                    <div key={item} className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-[#dfe6bf]">
                        {index + 1}
                      </span>
                      <span className="text-base text-[#edf0e9]">{item}</span>
                    </div>
                  ),
                )}
              </div>
              <div className="rounded-2xl bg-white/9 p-4">
                <p className="text-sm font-semibold text-[#dfe6bf]">
                  Reflection prompt
                </p>
                <p className="mt-2 text-sm leading-6 text-[#eef1ea]">
                  What action did you complete today that proved you can rely on
                  yourself?
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
