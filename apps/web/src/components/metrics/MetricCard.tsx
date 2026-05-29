import React from "react";

interface MetricCardProps {
    title: string;
    value: string | number;
    icon?: React.ReactNode;
}

export function MetricCard({ title, value, icon }: MetricCardProps) {
    return (
        <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
            <div className="flex items-center gap-2 mb-3">
                {icon && <div className="text-zinc-500">{icon}</div>}
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{title}</span>
            </div>
            <div className="text-2xl font-bold text-white">{value}</div>
        </div>
    );
}
