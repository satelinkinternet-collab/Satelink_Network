"use client";

import React, { useEffect, useState } from 'react';
import { InfraCard } from '../ui/InfraCard';

interface MetricCardProps {
    title: string;
    value: string | number;
    trend?: string;
    icon?: React.ReactNode;
}

export function MetricCard({ title, value, trend, icon }: MetricCardProps) {
    const [displayValue, setDisplayValue] = useState(value);

    // Optional mock dynamic increment effect
    useEffect(() => {
        if (typeof value === 'number') {
            const interval = setInterval(() => {
                setDisplayValue(prev => (prev as number) + Math.floor(Math.random() * 3));
            }, 3000);
            return () => clearInterval(interval);
        }
    }, [value]);

    return (
        <InfraCard className="flex flex-col gap-2 transition-colors hover:border-zinc-700">
            <div className="flex justify-between items-center text-muted">
                <span className="text-sm font-medium">{title}</span>
                {icon && <div className="text-zinc-500">{icon}</div>}
            </div>
            <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-bold text-white tracking-tight">{displayValue}</h3>
                {trend && <span className="text-success text-sm font-medium">{trend}</span>}
            </div>
        </InfraCard>
    );
}
