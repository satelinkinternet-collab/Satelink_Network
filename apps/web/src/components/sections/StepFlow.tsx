import React from "react";

interface Step {
    number: string;
    title: string;
    description: string;
}

interface StepFlowProps {
    steps: Step[];
}

export function StepFlow({ steps }: StepFlowProps) {
    return (
        <div className="space-y-0">
            {steps.map((step, i) => (
                <div key={i} className="flex gap-6 relative">
                    {/* Vertical line */}
                    <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold text-sm shrink-0">
                            {step.number}
                        </div>
                        {i < steps.length - 1 && (
                            <div className="w-px flex-1 bg-zinc-800 my-2" />
                        )}
                    </div>
                    {/* Content */}
                    <div className="pb-10">
                        <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                        <p className="text-sm text-zinc-400 leading-relaxed">{step.description}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}
