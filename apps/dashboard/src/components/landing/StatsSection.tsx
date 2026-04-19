"use client";

import { motion, useSpring, useTransform, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";

function Counter({ to, label }: { to: number; label: string }) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true });

    // Use a spring for smoother counting
    const spring = useSpring(0, { duration: 3000 }); // 3 seconds duration

    // Transform spring value to rounded integer string
    const displayValue = useTransform(spring, (current) => Math.round(current).toLocaleString());

    useEffect(() => {
        if (inView) {
            spring.set(to);
        }
    }, [inView, to, spring]);

    return (
        <div ref={ref} className="text-center">
            <motion.div className="text-5xl md:text-7xl font-bold text-white mb-2 font-mono">
                {displayValue}
            </motion.div>
            <div className="text-zinc-400 uppercase tracking-widest text-sm">{label}</div>
        </div>
    );
}

export function StatsSection() {
    return (
        <section className="bg-black py-24 border-y border-white/10">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    <Counter to={15420} label="Active Nodes" />
                    <Counter to={893} label="Cities Covered" />
                    <Counter to={2450000} label="GB Data Served" />
                </div>
            </div>
        </section>
    );
}
