"use client";

import { motion } from "framer-motion";
import { Shield, Coins, Globe, Cpu, ArrowUpRight, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface BentoCardProps {
    title: string;
    description: string;
    icon: React.ElementType;
    className?: string;
    delay?: number;
}

function BentoCard({ title, description, icon: Icon, className, delay = 0 }: BentoCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay, duration: 0.5 }}
            className={cn(
                "group relative overflow-hidden rounded-3xl bg-zinc-50 border border-zinc-200 p-6 flex flex-col justify-between hover:border-zinc-400 transition-all duration-500 shadow-sm hover:shadow-md",
                className
            )}
        >
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowUpRight className="w-5 h-5 text-zinc-400" />
            </div>

            <div className="mb-8">
                <div className="w-10 h-10 rounded-full bg-white border border-zinc-100 flex items-center justify-center mb-4 group-hover:bg-zinc-900 group-hover:text-white transition-colors duration-300">
                    <Icon className="w-5 h-5 text-zinc-600 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-2xl font-medium text-zinc-900 mb-2">{title}</h3>
                <p className="text-zinc-500 leading-relaxed text-sm">{description}</p>
            </div>
        </motion.div>
    );
}

export function FeaturesSection() {
    return (
        <section className="bg-white py-24 px-4 border-t border-zinc-200">
            <div className="container mx-auto max-w-6xl">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[300px]">

                    {/* Large Card: Stats Integration */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="md:col-span-2 rounded-3xl bg-zinc-50 border border-zinc-200 p-8 flex flex-col justify-between"
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-sm font-mono text-zinc-500 mb-1">NETWORK STATUS</h3>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-green-600 font-bold tracking-widest text-xs">OPERATIONAL</span>
                                </div>
                            </div>
                            <Activity className="w-6 h-6 text-zinc-400" />
                        </div>

                        <div className="grid grid-cols-3 gap-8 mt-auto">
                            <div>
                                <div className="text-3xl md:text-5xl font-mono text-zinc-900 mb-1">15k+</div>
                                <div className="text-xs text-zinc-500 uppercase">Active Nodes</div>
                            </div>
                            <div>
                                <div className="text-3xl md:text-5xl font-mono text-zinc-900 mb-1">893</div>
                                <div className="text-xs text-zinc-500 uppercase">Cities</div>
                            </div>
                            <div>
                                <div className="text-3xl md:text-5xl font-mono text-zinc-900 mb-1">2.4PB</div>
                                <div className="text-xs text-zinc-500 uppercase">Data Served</div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Passive Income */}
                    <BentoCard
                        title="Passive Income"
                        description="Monetize your idle bandwidth. Get paid in crypto for contributing to the network infrastructure."
                        icon={Coins}
                        delay={0.1}
                    />

                    {/* Enterprise Grade */}
                    <BentoCard
                        title="Enterprise Grade"
                        description="High-throughput architecture designed for mission-critical applications and scale."
                        icon={Shield}
                        delay={0.2}
                    />

                    {/* Global Network (Tall) */}
                    <BentoCard
                        title="Global Mesh"
                        description="A truly distributed network that cannot be shut down by any single entity."
                        icon={Globe}
                        className="md:row-span-2"
                        delay={0.3}
                    />

                    {/* Low Overhead */}
                    <BentoCard
                        title="Low Impact"
                        description="Runs silently in the background. Minimal CPU and memory usage."
                        icon={Cpu}
                        delay={0.4}
                    />

                    {/* Call to Action Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="rounded-3xl bg-zinc-900 p-8 flex flex-col justify-center items-center text-center hover:bg-zinc-800 transition-colors cursor-pointer group shadow-lg"
                        onClick={() => window.location.href = '/download'}
                    >
                        <h3 className="text-3xl font-bold text-white mb-2">Start Earning</h3>
                        <p className="text-zinc-400 mb-6 text-sm">Join the revolution today.</p>
                        <div className="w-12 h-12 rounded-full bg-white text-zinc-900 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <ArrowUpRight className="w-6 h-6" />
                        </div>
                    </motion.div>

                </div>
            </div>
        </section>
    );
}
