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
    opsPerMin: number;
    revenueLast5min: { count: number; total_usdt: number };
}

export function useNetworkStats() {
    const { data: netData, error: netError, isLoading: netLoading } = useSWR('/api/network/stats', fetcher, {
        refreshInterval: 5000,
        shouldRetryOnError: false,
    });

    const { data: sysData, error: sysError, isLoading: sysLoading } = useSWR('/system/status', fetcher, {
        refreshInterval: 5000,
        shouldRetryOnError: false,
    });

    const isLoading = netLoading || sysLoading;
    const error = netError || sysError;

    // Merge both sources: /api/network/stats for node/epoch counts,
    // /system/status for revenue and ops (single source of truth)
    const stats: NetworkStats | undefined = (netData || sysData) ? {
        totalNodes: netData?.totalNodes || 0,
        activeNodes: netData?.activeNodes || 0,
        currentEpoch: netData?.currentEpoch || sysData?.epoch_id || 0,
        totalRevenueUsdt: sysData?.total_revenue ?? netData?.totalRevenueUsdt ?? 0,
        totalOpsProcessed: netData?.totalOpsProcessed || 0,
        lastEpochClosedAt: netData?.lastEpochClosedAt || sysData?.last_epoch_close_time || null,
        opsPerMin: sysData?.ops_per_min || 0,
        revenueLast5min: sysData?.revenue_last_5min || { count: 0, total_usdt: 0 },
    } : undefined;

    const safeStats: NetworkStats = stats || {
        totalNodes: 0,
        activeNodes: 0,
        currentEpoch: 0,
        totalRevenueUsdt: 0,
        totalOpsProcessed: 0,
        lastEpochClosedAt: null,
        opsPerMin: 0,
        revenueLast5min: { count: 0, total_usdt: 0 },
    };

    return {
        stats,
        statsData: safeStats,
        isLoading,
        isError: error,
    };
}
