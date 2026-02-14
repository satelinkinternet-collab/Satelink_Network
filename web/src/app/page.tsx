"use client";

import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { StatsSection } from "@/components/landing/StatsSection";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#fdfbf7] text-zinc-900 font-sans selection:bg-zinc-200 selection:text-black">
      <LandingNav />
      <main>
        <HeroSection />
        <StatsSection />
        <FeaturesSection />

        {/* CTA Section */}
        <section className="py-24 text-center bg-white border-t border-zinc-200">
          <div className="container mx-auto px-6">
            <h2 className="text-4xl md:text-6xl font-bold mb-8 text-zinc-900">Ready to Join the Network?</h2>
            <div className="flex justify-center gap-4">
              <a href="/download" className="px-8 py-4 bg-zinc-900 text-white font-bold text-lg rounded-full hover:bg-zinc-800 transition-colors shadow-lg">
                Download Now
              </a>
            </div>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
