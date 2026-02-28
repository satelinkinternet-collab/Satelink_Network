"use client";

import React from 'react';
import { motion } from 'framer-motion';

export function ArchitectureDiagram() {
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.2 } },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
    };

    return (
        <div className="relative w-full max-w-4xl mx-auto p-8 border border-zinc-800 rounded-3xl bg-zinc-950/50 backdrop-blur-xl overflow-hidden glass-card">
            <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} className="flex flex-col gap-12 relative z-10">

                {/* Layer 1: App */}
                <motion.div variants={itemVariants} className="text-center">
                    <div className="inline-block px-8 py-4 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl z-20 relative text-white font-semibold">
                        Enterprise / dApp
                    </div>
                </motion.div>

                {/* Connectors */}
                <div className="absolute top-[72px] bottom-0 left-1/2 w-px bg-gradient-to-b from-blue-500/50 to-emerald-500/50 -translate-x-1/2 -z-10" />

                {/* Layer 2: API Gateway */}
                <motion.div variants={itemVariants} className="flex justify-center gap-8">
                    <div className="px-6 py-4 bg-zinc-900 border border-blue-500/30 rounded-xl relative z-20 text-blue-400 font-mono text-sm neon-glow-blue">
                        API Gateway
                    </div>
                    <div className="px-6 py-4 bg-zinc-900 border border-emerald-500/30 rounded-xl relative z-20 text-emerald-400 font-mono text-sm neon-glow-emerald">
                        Settlement Engine
                    </div>
                </motion.div>

                {/* Layer 3: Nodes */}
                <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-20">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-center text-xs text-zinc-400 flex flex-col items-center gap-2">
                            <div className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </div>
                            Node {i}
                        </div>
                    ))}
                </motion.div>

            </motion.div>

            {/* Background decoration */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1)_0%,transparent_60%)] -z-20 mix-blend-screen" />
        </div>
    );
}
