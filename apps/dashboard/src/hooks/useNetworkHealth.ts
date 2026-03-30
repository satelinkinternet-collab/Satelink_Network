"use client";
import useSWR from 'swr';
import api from '@/lib/api';

const fetcher = (url: string) => api.get(url, {
    params: { _t: Date.now() },
}).then(res => res.data);

interface HealthResponse {
    status: 'healthy' | 'degraded' | 'offline';
    nodeHealth: {
        online: number;
        jailed: number;
        slashed: number;
    };
    alerts: number;
    snapshotUrl: string;
}

export function useNetworkHealth() {
    const { data, error, isLoading } = useSWR<{ ok: boolean, data: HealthResponse }>('/network/health', fetcher, {
        refreshInterval: 3000, // 3 second poll — real-time
        dedupingInterval: 0,
        shouldRetryOnError: false,
    });

    if (error) {
        console.error('[HEALTH] Network health check failed', error);
    }

    return {
        health: data?.data,
        isLoading,
        isError: error,
    };
}
