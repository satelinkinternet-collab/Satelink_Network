"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";

interface NetworkStats {
    totalNodes: number;
    activeNodes: number;
    currentEpoch: number;
    totalRevenueUsdt: number;
    totalOpsProcessed: number;
}

export function useNetworkStats() {
    const [stats, setStats] = useState<NetworkStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function fetchStats() {
            try {
                const { data } = await api.get("/system/status");
                if (!cancelled) {
                    setStats({
                        totalNodes: Number(data.total_nodes || data.totalNodes || 0),
                        activeNodes: Number(data.active_nodes || data.activeNodes || 0),
                        currentEpoch: Number(data.current_epoch || data.currentEpoch || 0),
                        totalRevenueUsdt: Number(data.total_revenue || data.totalRevenueUsdt || 0),
                        totalOpsProcessed: Number(data.total_ops || data.totalOpsProcessed || 0),
                    });
                }
            } catch {
                // Silently fail for public landing page — stats are optional
                if (!cancelled) {
                    setStats({
                        totalNodes: 0,
                        activeNodes: 0,
                        currentEpoch: 0,
                        totalRevenueUsdt: 0,
                        totalOpsProcessed: 0,
                    });
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        }

        fetchStats();
        return () => { cancelled = true; };
    }, []);

    return { stats, isLoading };
}
