"use client";

import React from 'react';
import { motion } from 'framer-motion';

interface AnimatedNodeCardProps {
    id: string;
    status: 'active' | 'syncing' | 'offline';
    delay?: number;
}

export function AnimatedNodeCard({ id, status, delay = 0 }: AnimatedNodeCardProps) {
    const statusColors = {
        active: 'bg-emerald-500',
        syncing: 'bg-blue-500',
        offline: 'bg-red-500',
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            className="p-4 rounded-xl border border-zinc-800 bg-zinc-900 flex items-center gap-4"
        >
            <div className="relative flex h-3 w-3">
                {status !== 'offline' && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusColors[status]}`}></span>}
                <span className={`relative inline-flex rounded-full h-3 w-3 ${statusColors[status]}`}></span>
            </div>
            <div>
                <p className="text-sm font-medium text-white font-mono">{id}</p>
                <p className="text-xs text-zinc-500 capitalize">{status}</p>
            </div>
        </motion.div>
    );
}
