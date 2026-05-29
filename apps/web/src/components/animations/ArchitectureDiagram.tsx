"use client";

import React from "react";

export function ArchitectureDiagram() {
    const layers = [
        { label: "Client Layer", items: ["dApps", "Enterprises", "API Consumers"], color: "border-blue-500/40 bg-blue-500/5" },
        { label: "Execution Layer", items: ["RPC Relay", "AI Inference", "Automation", "Webhooks"], color: "border-emerald-500/40 bg-emerald-500/5" },
        { label: "Settlement Layer", items: ["Epoch Aggregator", "Revenue Split", "On-Chain Claims"], color: "border-amber-500/40 bg-amber-500/5" },
        { label: "Infrastructure", items: ["Node Registry", "PostgreSQL", "Redis Queue", "Fuse Network"], color: "border-violet-500/40 bg-violet-500/5" },
    ];

    return (
        <div className="max-w-3xl mx-auto space-y-4">
            {layers.map((layer, i) => (
                <div key={i} className={`rounded-xl border ${layer.color} p-6`}>
                    <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">{layer.label}</div>
                    <div className="flex flex-wrap gap-3">
                        {layer.items.map((item, j) => (
                            <span
                                key={j}
                                className="px-3 py-1.5 bg-zinc-800/80 border border-zinc-700/60 rounded-md text-sm text-zinc-300"
                            >
                                {item}
                            </span>
                        ))}
                    </div>
                    {i < layers.length - 1 && (
                        <div className="flex justify-center mt-4">
                            <div className="w-px h-4 bg-zinc-700" />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
