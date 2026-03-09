"use client";
import useSWR from 'swr';
import api from '@/lib/api';

const fetcher = (url: string) => api.get(url).then(res => res.data);

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
        refreshInterval: 60000, // 1 min poll
    });

    return {
        health: data?.data,
        isLoading,
        isError: error,
    };
}
