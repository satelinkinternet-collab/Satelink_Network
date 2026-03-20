"use client";
import useSWR from 'swr';
import api from '@/lib/api';

const fetcher = (url: string) => api.get(url).then(res => res.data);

interface NodePoolSnapshot {
    totalRevenue: number;
    nodePoolAllocation: number;
    managedSplit: number;
    routerSplit: number;
    infraReservePct: number;
    minimumEarningsThreshold: number;
    claimWindowDays: number;
    cooldownHours: number;
}

interface AdminConfig {
    platformFeePct: number;
    nodePoolPct: number;
    infraReservePct: number;
    distributorPct: number;
}

export function useNodeEconomics(type: 'pool'): { data: NodePoolSnapshot | undefined; isLoading: boolean; isError: any };
export function useNodeEconomics(type: 'config'): { data: AdminConfig | undefined; isLoading: boolean; isError: any };
export function useNodeEconomics(type: 'pool' | 'config') {
    const path = type === 'pool' ? '/economics/node-pool/current' : '/economics/config';
    const { data, error, isLoading } = useSWR<{ ok: boolean, data: any }>(path, fetcher, {
        revalidateOnFocus: false,
    });

    return {
        data: data?.data,
        isLoading,
        isError: error,
    };
}
