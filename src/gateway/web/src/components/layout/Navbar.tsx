"use client";

import Link from "next/link";
import useSWR from "swr";
import { useAuth } from "@/hooks/use-auth";
import { LayoutDashboard, LogOut, Wallet, ShieldCheck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const fetcher = (url: string) => fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
});

export function Navbar() {
    const { user, logout } = useAuth();

    // Auto-refresh every 30s
    const { data: stats, error } = useSWR('/api/network/stats', fetcher, {
        refreshInterval: 30000,
        revalidateOnFocus: false
    });

    const mode = stats?.settlement_mode || "LOADING";

    const getBadgeStyle = (mode: string) => {
        if (mode === "EVM_LIVE") return "bg-[#22C55E]/20 text-[#22C55E] border-[#22C55E]/30";
        if (mode === "SIMULATED") return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
        if (mode === "SHADOW") return "bg-[#3B82F6]/20 text-[#3B82F6] border-[#3B82F6]/30";
        if (mode === "LOADING") return "bg-[#1A1A0A] text-zinc-400 border-[#262626] animate-pulse";
        return "bg-[#1A1A0A] text-zinc-400 border-[#262626] border";
    };

    return (
        <header className="h-16 border-b border-[#262626] bg-[#0A0A0A] flex items-center justify-between px-6 z-50 shrink-0">
            {/* Left Box: Logo */}
            <div className="flex items-center gap-4">
                <Link href="/" className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#3B82F6] flex items-center justify-center text-white">
                        <LayoutDashboard className="h-4 w-4" />
                    </div>
                    <span className="text-lg font-bold tracking-tight text-white hover:text-[#3B82F6] transition-colors">
                        Satelink
                    </span>
                </Link>
            </div>

            {/* Middle: Badges */}
            <div className="hidden lg:flex flex-1 justify-center items-center gap-4">
                {/* Network Status */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[#1A1A0A] border border-[#262626] text-sm font-medium">
                    <div className={`h-2 w-2 rounded-full ${error ? "bg-[#EF4444]" : stats ? "bg-[#22C55E] animate-pulse" : "bg-zinc-500"}`} />
                    <span className="text-zinc-300">Network {stats ? "Live" : error ? "Error" : "Connecting"}</span>
                </div>

                {/* Settlement Mode */}
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl border text-sm font-semibold uppercase tracking-wider ${getBadgeStyle(mode)}`}>
                    <ShieldCheck className="h-4 w-4" />
                    {mode.replace('_', ' ')}
                </div>

                {/* Treasury Indicator */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[#1A1A0A] border border-[#262626] text-sm">
                    <span className="text-zinc-400">Treasury:</span>
                    <span className="text-white font-mono font-medium">
                        {stats?.total_revenue_usdt !== undefined ? `${(stats.total_revenue_usdt).toLocaleString()} USDT` : "---"}
                    </span>
                </div>
            </div>

            {/* Right: User */}
            <div className="flex items-center gap-4">
                {user ? (
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-2xl bg-[#1A1A0A] border border-[#262626]">
                            <Wallet className="h-4 w-4 text-[#3B82F6]" />
                            <span className="font-mono text-zinc-200 font-medium">
                                {user.wallet.slice(0, 6)}...{user.wallet.slice(-4)}
                            </span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={logout} className="text-zinc-400 hover:text-[#EF4444] hover:bg-[#EF4444]/10 rounded-2xl" title="Sign Out">
                            <LogOut className="h-4 w-4" />
                        </Button>
                    </div>
                ) : (
                    <Link href="/login">
                        <Button variant="default" className="bg-[#3B82F6] hover:bg-[#3B82F6]/80 text-white rounded-2xl border border-[#3B82F6]/50">
                            Connect Wallet
                        </Button>
                    </Link>
                )}
            </div>
        </header>
    );
}
