import React from 'react';

interface StepFlowProps {
    steps: {
        title: string;
        description: string;
        number: number | string;
    }[];
}

export function StepFlow({ steps }: StepFlowProps) {
    return (
        <div className="flex flex-col md:flex-row gap-8 relative z-10">
            {/* Connector line for desktop */}
            <div className="hidden md:block absolute top-[28px] left-[5%] right-[5%] h-px bg-zinc-800 -z-10" />

            {steps.map((step, i) => (
                <div key={i} className="flex-1 flex flex-col items-center text-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-xl font-bold text-white shadow-xl shadow-black">
                        {step.number}
                    </div>
                    <h3 className="text-xl font-semibold text-white mt-4">{step.title}</h3>
                    <p className="text-muted leading-relaxed max-w-sm">{step.description}</p>
                </div>
            ))}
        </div>
    );
}
