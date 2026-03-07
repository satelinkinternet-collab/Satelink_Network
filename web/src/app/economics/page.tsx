"use client";

import { RevenueSplitChart } from "@/components/economics/RevenueSplitChart";

export default function EconomicsPage() {
    return (
        <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-500 w-full pb-24 pt-4">
            <div>
                <h1 className="text-3xl font-bold font-mono text-white mb-4">/economics</h1>
                <p className="text-zinc-400 text-lg max-w-3xl leading-relaxed">
                    Satelink employs a transparent, programmatic revenue distribution model. The following visual represents the real-time parameter states defining protocol yields.
                </p>
            </div>

            <RevenueSplitChart />
        </div>
    );
}
