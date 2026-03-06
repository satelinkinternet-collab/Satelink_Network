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
    });

    return {
        stats: data,
        isLoading,
        isError: error,
    };
}
