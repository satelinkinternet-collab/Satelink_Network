"use client";

import { useAuth } from "@/hooks/use-auth";
import { useNodeEarnings } from "@/hooks/useNodeEarnings";
import { CTAButton } from "@/components/ui/CTAButton";
import { RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

export function NodeEarningsDashboard() {
    const { user, loading: authLoading } = useAuth();
    const { earnings, isLoading: earningsLoading, isError, claim, isClaiming, claimError, withdraw, isWithdrawing, withdrawError, withdrawResult } = useNodeEarnings();

    // Avoid hydration mismatch by waiting for mount
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    if (!mounted || authLoading) return <div className="p-8 border border-border rounded-xl bg-surface animate-pulse h-64"></div>;

    if (!user) {
        return (
            <div className="p-10 border border-border bg-card rounded-2xl text-center">
                <h3 className="text-2xl font-bold text-white mb-4">Node Operator Dashboard</h3>
                <p className="text-zinc-400 mb-6 max-w-lg mx-auto">
                    Authenticate to view your real-time epoch earnings, claim available yields, and manage your node.
                </p>
                <CTAButton href="/login" variant="primary">
                    Connect Wallet / Login
                </CTAButton>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-6 border border-red-500/20 bg-red-500/10 rounded-2xl text-red-400 flex items-center gap-3">
                <AlertCircle className="w-5 h-5" />
                Failed to load node economics. Please check your connection.
            </div>
        );
    }

    return (
        <div className="p-8 border border-emerald-500/20 bg-[#111111] rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] -z-10 translate-x-1/2 -translate-y-1/2" />

            <div className="flex justify-between items-center mb-8 border-b border-border pb-6">
                <div>
                    <h3 className="text-2xl font-bold text-white">Your Node Dashboard</h3>
                    <p className="text-zinc-400 text-sm mt-1">Authenticated as {user.wallet || 'Operator'}</p>
                </div>
                {earnings?.isInCooldown && (
                    <span className="px-3 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full text-xs font-medium">
                        Cooldown Active (Next: {new Date(earnings.nextWithdrawalAvailableAt).toLocaleString()})
                    </span>
                )}
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="p-6 bg-[#0A0A0A] border border-border rounded-2xl">
                    <p className="text-zinc-500 text-sm font-medium mb-2">Claimable Balance</p>
                    <div className="text-3xl font-bold text-emerald-400">
                        {earningsLoading ? "..." : `$${(earnings?.claimableBalance || 0).toLocaleString()}`}
                    </div>
                </div>
                <div className="p-6 bg-[#0A0A0A] border border-border rounded-2xl">
                    <p className="text-zinc-500 text-sm font-medium mb-2">Epoch Earnings (Unsettled)</p>
                    <div className="text-2xl font-bold text-white">
                        {earningsLoading ? "..." : `$${(earnings?.currentEpochEarnings || 0).toLocaleString()}`}
                    </div>
                </div>
                <div className="p-6 bg-[#0A0A0A] border border-border rounded-2xl">
                    <p className="text-zinc-500 text-sm font-medium mb-2">Claim Expiry</p>
                    <div className="text-lg font-bold text-zinc-300">
                        {earningsLoading ? "..." : (earnings?.claimExpiryDate ? new Date(earnings.claimExpiryDate).toLocaleDateString() : 'N/A')}
                    </div>
                </div>
            </div>

            {/* Error notifications */}
            {claimError && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> {claimError}
                </div>
            )}
            {withdrawError && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> {withdrawError}
                </div>
            )}
            {withdrawResult && (
                <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Withdrawal successful! {withdrawResult.txHash ? `Tx: ${withdrawResult.txHash}` : `Ledger Conf: ${withdrawResult.ledgerConfirmation}`}
                </div>
            )}

            <div className="flex gap-4">
                <button
                    onClick={() => claim()}
                    disabled={isClaiming || earningsLoading || !earnings?.canClaim}
                    className="px-6 py-3 bg-white text-black font-semibold rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {isClaiming && <RefreshCw className="w-4 h-4 animate-spin" />}
                    Claim Epoch Yield
                </button>

                <button
                    onClick={() => withdraw()}
                    disabled={isWithdrawing || earningsLoading || (earnings?.claimableBalance || 0) === 0 || earnings?.isInCooldown}
                    className="px-6 py-3 bg-zinc-800 text-white font-semibold border border-zinc-700 rounded-xl hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {isWithdrawing && <RefreshCw className="w-4 h-4 animate-spin" />}
                    Withdraw to Wallet
                </button>
            </div>
        </div>
    );
}
