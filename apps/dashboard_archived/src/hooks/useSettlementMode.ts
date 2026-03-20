"use client";
import useSWR from 'swr';
import api from '@/lib/api';

const fetcher = (url: string) => api.get(url).then(res => res.data);

export type SettlementMode = 'SIMULATED' | 'SHADOW' | 'EVM';

interface SettlementModeResponse {
    mode: SettlementMode;
    chainName?: string;
    contractAddress?: string;
    ledgerId?: string;
}

export function useSettlementMode() {
    const { data, error, isLoading } = useSWR<{ ok: boolean, data: SettlementModeResponse }>('/settlement/mode', fetcher, {
        revalidateOnFocus: false, // Doesn't change often
    });

    return {
        modeData: data?.data,
        isLoading,
        isError: error,
    };
}
