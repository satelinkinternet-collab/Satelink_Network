"use client";

import { motion } from "framer-motion";
import { ArrowDownRight } from "lucide-react";

export function HeroSection() {
    return (
        <section className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-[#fdfbf7] pt-20">
            {/* Background Texture - Subtle Grid */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,rgba(0,0,0,0.1),rgba(0,0,0,0))]" />

            <div className="relative z-10 container mx-auto px-6 flex flex-col items-start max-w-5xl">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="w-full"
                >
                    <h1 className="text-5xl md:text-8xl font-medium tracking-tighter text-zinc-900 mb-8 leading-[0.9]">
                        BUILDING THE <br />
                        <span className="text-zinc-400">RESILIENT</span> <br />
                        INTERNET.
                    </h1>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.8 }}
                    className="flex flex-col md:flex-row gap-12 items-start max-w-3xl"
                >
                    <p className="text-xl md:text-2xl text-zinc-400 leading-relaxed font-light">
                        Satelink aggregates idle bandwidth from millions of devices to create a censorship-resistant, decentralized connectivity layer.
                    </p>

                    <div className="flex flex-col gap-4 shrink-0">
                        <a href="/download" className="group flex items-center gap-4 text-zinc-900 hover:text-blue-600 transition-colors">
                            <span className="text-lg border-b border-zinc-900/20 pb-1 group-hover:border-blue-600">Download Node</span>
                            <ArrowDownRight className="w-5 h-5" />
                        </a>
                        <a href="/about" className="group flex items-center gap-4 text-zinc-500 hover:text-zinc-900 transition-colors">
                            <span className="text-lg border-b border-zinc-500/20 pb-1 group-hover:border-zinc-900">Read Manifesto</span>
                            <ArrowDownRight className="w-5 h-5" />
                        </a>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
