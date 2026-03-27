"use client";

import React from 'react';
import { InfraCard } from '../ui/InfraCard';

interface MetricCardProps {
    title: string;
    value: string | number;
    trend?: string;
    icon?: React.ReactNode;
    loading?: boolean;
}

export function MetricCard({ title, value, trend, icon, loading }: MetricCardProps) {
    if (loading) return <InfraCard className="flex flex-col gap-2"><div className="text-zinc-500 text-sm animate-pulse">Loading...</div></InfraCard>;

    const finalValue = (value === 0 || value === '0') ? "—" : value;

    return (
        <InfraCard className="flex flex-col gap-2 transition-colors hover:border-zinc-700">
            <div className="flex justify-between items-center text-muted">
                <span className="text-sm font-medium">{title}</span>
                {icon && <div className="text-zinc-500">{icon}</div>}
            </div>
            <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-bold text-white tracking-tight">{finalValue}</h3>
                {trend && <span className="text-success text-sm font-medium">{trend}</span>}
            </div>
        </InfraCard>
    );
}
