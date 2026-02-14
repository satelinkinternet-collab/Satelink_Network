"use client";

import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-[#fdfbf7] text-zinc-900 font-sans">
            <LandingNav />
            <main className="pt-32 pb-24 container mx-auto px-6 max-w-4xl">
                <h1 className="text-5xl md:text-7xl font-bold mb-12 bg-gradient-to-r from-zinc-900 to-zinc-500 bg-clip-text text-transparent">
                    Our Vision
                </h1>

                <div className="space-y-8 text-xl text-zinc-300 leading-relaxed">
                    <p>
                        Satelink is building the world's largest decentralized connectivity network. By leveraging the idle bandwidth of millions of devices, we are creating a resilient, censorship-resistant, and high-performance internet infrastructure owned by the people.
                    </p>
                    <p>
                        Our mission is to democratize internet access and monetize the vast amounts of unused bandwidth that currently goes to waste.
                    </p>
                </div>

                <div className="my-16 h-px bg-zinc-800" />

                <h2 className="text-3xl font-bold mb-8 text-white">Roadmap</h2>

                <div className="relative border-l border-zinc-300 ml-4 space-y-12">
                    <div className="pl-8 relative">
                        <div className="absolute -left-[5px] top-2 w-2.5 h-2.5 rounded-full bg-zinc-900 shadow-[0_0_10px_rgba(0,0,0,0.2)]" />
                        <h3 className="text-xl font-bold text-zinc-900 mb-2">Phase 1: Genesis (Current)</h3>
                        <p className="text-zinc-600">Launch of MVP Node software. Initial network bootstrapping. Alpha testing with core community.</p>
                    </div>
                    <div className="pl-8 relative">
                        <div className="absolute -left-[5px] top-2 w-2.5 h-2.5 rounded-full bg-zinc-300" />
                        <h3 className="text-xl font-bold text-zinc-400 mb-2">Phase 2: Expansion</h3>
                        <p className="text-zinc-400">Public beta release. Token generation event (TGE). Integration with enterprise partners.</p>
                    </div>
                    <div className="pl-8 relative">
                        <div className="absolute -left-[5px] top-2 w-2.5 h-2.5 rounded-full bg-zinc-300" />
                        <h3 className="text-xl font-bold text-zinc-400 mb-2">Phase 3: Autonomy</h3>
                        <p className="text-zinc-400">Full DAO governance. Global satellite integration. Planetary-scale connectivity.</p>
                    </div>
                </div>
            </main>
            <LandingFooter />
        </div>
    );
}
