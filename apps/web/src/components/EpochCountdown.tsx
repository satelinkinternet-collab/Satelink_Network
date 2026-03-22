"use client";

import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface EpochCountdownProps {
    epochDuration?: number; // seconds, default 3600
    className?: string;
}

export function EpochCountdown({ epochDuration = 3600, className = "" }: EpochCountdownProps) {
    const [remaining, setRemaining] = useState<number>(0);

    useEffect(() => {
        function calcRemaining() {
            const now = Math.floor(Date.now() / 1000);
            const elapsed = now % epochDuration;
            return epochDuration - elapsed;
        }

        setRemaining(calcRemaining());

        const interval = setInterval(() => {
            setRemaining(calcRemaining());
        }, 1000);

        return () => clearInterval(interval);
    }, [epochDuration]);

    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const seconds = remaining % 60;

    const pad = (n: number) => n.toString().padStart(2, "0");

    return (
        <div className={`inline-flex items-center gap-2 text-sm ${className}`}>
            <Clock className="w-4 h-4 text-zinc-500" />
            <span className="text-zinc-400">Next epoch in</span>
            <span className="font-mono font-semibold text-zinc-200">
                {pad(hours)}:{pad(minutes)}:{pad(seconds)}
            </span>
        </div>
    );
}
