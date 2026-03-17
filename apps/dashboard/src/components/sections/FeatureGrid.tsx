import React from 'react';

interface FeatureGridProps {
    features: {
        title: string;
        description: string;
        icon?: React.ReactNode;
    }[];
}

export function FeatureGrid({ features }: FeatureGridProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
                <div key={i} className="p-6 rounded-2xl bg-surface border border-border flex flex-col gap-4 transition-colors hover:bg-card">
                    {feature.icon && (
                        <div className="h-12 w-12 rounded-xl bg-[#1A1A1A] border border-[#262626] flex items-center justify-center text-white">
                            {feature.icon}
                        </div>
                    )}
                    <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
                    <p className="text-muted leading-relaxed">{feature.description}</p>
                </div>
            ))}
        </div>
    );
}
