import React from "react";

interface Feature {
    title: string;
    description: string;
    icon: React.ReactNode;
}

interface FeatureGridProps {
    features: Feature[];
}

export function FeatureGrid({ features }: FeatureGridProps) {
    return (
        <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
                <div
                    key={i}
                    className="p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800/60 hover:border-zinc-700/80 transition-all"
                >
                    <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center mb-5">
                        {feature.icon}
                    </div>
                    <h3 className="text-lg font-bold text-white mb-3">{feature.title}</h3>
                    <p className="text-sm text-zinc-400 leading-relaxed">{feature.description}</p>
                </div>
            ))}
        </div>
    );
}
