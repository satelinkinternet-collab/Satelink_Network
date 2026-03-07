"use client";

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
    DollarSign, TrendingUp, Wallet, ArrowDownToLine,
    Clock, CheckCircle, Loader2
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer
} from 'recharts';

export default function NodeEarningsPage() {
    const [loading, setLoading] = useState(true);
    const [claiming, setClaiming] = useState(false);
    const [stats, setStats] = useState<any>(null);
    const [earnings, setEarnings] = useState<any[]>([]);
    const [withdrawals, setWithdrawals] = useState<any[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await api.get('/node/stats');
            if (res.data.ok) {
                setStats(res.data.stats);
                setEarnings(res.data.earnings || []);
                setWithdrawals(res.data.withdrawals || []);
            }
        } catch (err) {
            toast.error('Failed to load earnings data');
        } finally {
            setLoading(false);
        }
    };

    const handleClaim = async () => {
        setClaiming(true);
        try {
            const res = await api.post('/node/claim', { signature: 'pending' });
            if (res.data.ok) {
                toast.success('Claim submitted successfully');
                fetchData();
            } else {
                toast.error(res.data.error || 'Claim failed');
            }
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Claim request failed');
        } finally {
            setClaiming(false);
        }
    };

    const chartData = earnings.map((e: any) => ({
        epoch: `E${e.epoch_id}`,
        amount: e.amount_usdt || 0,
    })).reverse();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
            </div>
        );
    }

    const kpis = [
        { label: 'Total Earned', value: `$${stats?.totalEarned || '0.00'}`, icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        { label: 'Claimable', value: `$${stats?.claimable || '0.00'}`, icon: TrendingUp, color: 'text-violet-400', bg: 'bg-violet-500/10' },
        { label: 'Withdrawn', value: `$${stats?.totalWithdrawn || '0.00'}`, icon: Wallet, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    ];

    return (
        <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-[1440px] mx-auto fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-50">Node Earnings</h1>
                    <p className="text-sm text-zinc-500 mt-1">Track and claim your node operator rewards</p>
                </div>
                <Button
                    onClick={handleClaim}
                    disabled={claiming || parseFloat(stats?.claimable || '0') === 0}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold w-full sm:w-auto"
                >
                    {claiming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowDownToLine className="mr-2 h-4 w-4" />}
                    Claim Rewards
                </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                {kpis.map((kpi, i) => (
                    <Card key={i} className="bg-zinc-900/80 border-zinc-800/60 glow-shadow">
                        <CardContent className="p-4 sm:p-5">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">{kpi.label}</span>
                                <div className={`w-8 h-8 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                                    <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                                </div>
                            </div>
                            <div className="text-2xl sm:text-3xl font-bold text-zinc-50 tracking-tight">{kpi.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Earnings Chart */}
            <Card className="bg-zinc-900/80 border-zinc-800/60 glow-shadow">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-zinc-300">Earnings by Epoch</CardTitle>
                    <CardDescription className="text-xs text-zinc-600">USDT earned per epoch period</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[220px] sm:h-[300px]">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                                    <XAxis dataKey="epoch" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={{ stroke: '#27272a' }} />
                                    <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={{ stroke: '#27272a' }} />
                                    <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fafafa', fontSize: '12px' }} />
                                    <Bar dataKey="amount" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="USDT" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-zinc-600 text-sm">No earnings data yet</div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Withdrawal History */}
            <Card className="bg-zinc-900/80 border-zinc-800/60 glow-shadow">
                <CardHeader className="pb-2 border-b border-zinc-800/40">
                    <CardTitle className="text-sm font-semibold text-zinc-300">Withdrawal History</CardTitle>
                    <CardDescription className="text-xs text-zinc-600">Past withdrawal transactions</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {withdrawals.length > 0 ? (
                        <div className="divide-y divide-zinc-800/40">
                            {withdrawals.map((w: any, i: number) => (
                                <div key={i} className="px-4 py-3 flex items-center justify-between hover:bg-zinc-800/20 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${w.status === 'COMPLETED' ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
                                            {w.status === 'COMPLETED' ? (
                                                <CheckCircle className="w-4 h-4 text-emerald-400" />
                                            ) : (
                                                <Clock className="w-4 h-4 text-amber-400" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-zinc-200">${(w.amount_usdt || 0).toFixed(2)}</p>
                                            <p className="text-[11px] text-zinc-500">
                                                {w.created_at ? new Date(w.created_at * 1000).toLocaleDateString() : 'Unknown date'}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge className={`text-[10px] ${w.status === 'COMPLETED' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/15 text-amber-400 border-amber-500/30'}`}>
                                        {w.status}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-zinc-600 text-sm">No withdrawals yet</div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
