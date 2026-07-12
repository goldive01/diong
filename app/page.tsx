import { CommunityPreview } from "@/src/components/landing/community-preview";
import { Features } from "@/src/components/landing/features";
import { FinalCta } from "@/src/components/landing/final-cta";
import { Footer } from "@/src/components/landing/footer";
import { Hero } from "@/src/components/landing/hero";
import { HowItWorks } from "@/src/components/landing/how-it-works";
import { Navbar } from "@/src/components/landing/navbar";
import { PrimeProtocolCard } from "@/src/components/prime/prime-protocol-card";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f7f4ee] text-[#1d2420]">
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <Features />
        <section
          id="prime-protocol"
          className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-6 lg:px-8 lg:py-24"
        >
          <div className="mb-8 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6f7b4f]">
              Example Prime Protocol
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#1d2420] sm:text-4xl">
              A structured prompt for attention, reflection and action.
            </h2>
          </div>
          <PrimeProtocolCard />
        </section>
        <CommunityPreview />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
