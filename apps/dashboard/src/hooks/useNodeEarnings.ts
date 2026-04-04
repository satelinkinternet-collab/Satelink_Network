"use client";
import useSWR from 'swr';
import api from '@/lib/api';
import { useState } from 'react';

const fetcher = (url: string) => api.get(url).then(res => res.data);

interface EarningsResponse {
    currentEpochEarnings: number;
    claimableBalance: number;
    lockedReserve: number;
    nextWithdrawalAvailableAt: string;
    claimExpiryDate: string;
    isInCooldown: boolean;
    canClaim: boolean;
}

export function useNodeEarnings() {
    // Pass an array to SWR to ensure unique caching based on auth conceptually 
    const { data, error, isLoading, mutate } = useSWR<{ ok: boolean, data: EarningsResponse }>('/node/me/earnings', fetcher, {
        shouldRetryOnError: false, // Usually 401s if unauth, don't spam
    });

    const [isClaiming, setIsClaiming] = useState(false);
    const [claimError, setClaimError] = useState<string | null>(null);

    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [withdrawResult, setWithdrawResult] = useState<{ txHash?: string, ledgerConfirmation?: string } | null>(null);
    const [withdrawError, setWithdrawError] = useState<string | null>(null);

    const claim = async () => {
        setIsClaiming(true);
        setClaimError(null);
        try {
            const res = await api.post('/node/me/claim');
            if (res.data.ok) {
                mutate(); // Refresh the earnings balance
                return true;
            }
            setClaimError(res.data.error || "Claim failed");
        } catch (err: any) {
            setClaimError(err.response?.data?.error || "Network error during claim");
        } finally {
            setIsClaiming(false);
        }
        return false;
    };

    const withdraw = async () => {
        setIsWithdrawing(true);
        setWithdrawError(null);
        setWithdrawResult(null);
        try {
            const res = await api.post('/node/me/withdraw');
            if (res.data.ok) {
                setWithdrawResult(res.data.result);
                mutate();
                return true;
            }
            setWithdrawError(res.data.error || "Withdrawal failed");
        } catch (err: any) {
            setWithdrawError(err.response?.data?.error || "Treasury liquidity check failed or network error");
        } finally {
            setIsWithdrawing(false);
        }
        return false;
    };

    return {
        earnings: data?.data,
        isLoading,
        isError: error,
        claim,
        isClaiming,
        claimError,
        withdraw,
        isWithdrawing,
        withdrawResult,
        withdrawError
    };
}
