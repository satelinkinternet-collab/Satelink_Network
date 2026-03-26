"use client";
import useSWR from 'swr';
import api from '@/lib/api';

const fetcher = (url: string) => api.get(url).then(res => res.data);

interface NetworkStats {
    totalNodes: number;
    activeNodes: number;
    currentEpoch: number;
    totalRevenueUsdt: number;
    totalOpsProcessed: number;
    lastEpochClosedAt: string | null;
}

export function useNetworkStats() {
    const { data, error, isLoading } = useSWR<NetworkStats>('/api/network/stats', fetcher, {
        refreshInterval: 30000, // auto-refresh every 30 seconds
        shouldRetryOnError: false, // handeled by axios interceptor
    });

    // Provide safe defaults to prevent UI crashes
    const safeStats = data || {
        totalNodes: 0,
        activeNodes: 0,
        currentEpoch: 0,
        totalRevenueUsdt: 0,
        totalOpsProcessed: 0,
        lastEpochClosedAt: null
    };

    return {
        stats: data ? safeStats : undefined, // return undefined if loading/error but safeStats is available
        statsData: safeStats,
        isLoading,
        isError: error,
    };
}
