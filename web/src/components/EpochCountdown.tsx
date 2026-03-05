"use client";

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import api from '@/lib/api';

function formatCountdown(secs: number): string {
    if (secs <= 0) return '00:00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}

export function EpochCountdown({ className = '' }: { className?: string }) {
    const [epochId, setEpochId] = useState<number | null>(null);
    const [remainingSecs, setRemainingSecs] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        api.get('/admin-api/epoch/current')
            .then(res => {
                if (res.data?.ok && res.data.epoch) {
                    setEpochId(res.data.epoch.id);
                    setRemainingSecs(res.data.epoch.remaining_secs);
                    setReady(true);
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    // Tick down every second once data is loaded
    useEffect(() => {
        if (!ready) return;
        const id = setInterval(() => {
            setRemainingSecs(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(id);
    }, [ready]);

    if (loading) {
        return (
            <div className={`flex items-center gap-2 text-xs text-zinc-500 ${className}`}>
                <Clock className="w-3.5 h-3.5 animate-pulse" />
                <span className="text-zinc-600">Epoch —</span>
            </div>
        );
    }

    if (!ready || remainingSecs === null) {
        return (
            <div className={`flex items-center gap-2 text-xs text-zinc-500 ${className}`}>
                <Clock className="w-3.5 h-3.5" />
                <span className="text-zinc-600">No active epoch</span>
            </div>
        );
    }

    const isEnding = remainingSecs < 3600; // last hour warning

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <Clock className={`w-3.5 h-3.5 ${isEnding ? 'text-amber-400' : 'text-zinc-400'}`} />
            <span className="text-xs text-zinc-500">Epoch #{epochId}</span>
            <Badge
                className={`font-mono text-[11px] tabular-nums px-2 py-0.5 ${
                    isEnding
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-zinc-800/80 text-zinc-300 border-zinc-700/60'
                }`}
            >
                {formatCountdown(remainingSecs)}
            </Badge>
            {isEnding && (
                <span className="text-[10px] text-amber-400/70 font-medium">ending soon</span>
            )}
        </div>
    );
}
