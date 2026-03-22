
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCcw, TrendingUp, Users, DollarSign, Activity } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader } from '@/components/admin/admin-shared';

export default function AcquisitionPage() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = () => {
        setLoading(true);
        api.get('/admin/revenue/acquisition').then(res => {
            if (res.data.ok) setStats(res.data.data);
        }).finally(() => setLoading(false));
    };

    useEffect(() => { fetchData(); }, []);

    if (!stats && loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
            <PageHeader title="Growth Analytics" subtitle="CAC, LTV, and Churn metrics (30d rolling)" />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-zinc-400">CAC (Cost Per Node)</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold flex items-center text-white">
                            <DollarSign className="w-5 h-5 mr-1 text-zinc-500" /> {stats?.cac?.toFixed(2) || '0.00'}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-zinc-400">LTV Estimate (6mo)</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold flex items-center text-green-400">
                            <DollarSign className="w-5 h-5 mr-1" /> {stats?.ltv?.toFixed(2) || '0.00'}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-zinc-400">Payback Period</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold flex items-center text-blue-400">
                            <Activity className="w-5 h-5 mr-2" /> {stats?.payback_days?.toFixed(1) || '0.0'} days
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-zinc-400">Churn Rate</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold flex items-center text-red-400">
                            <TrendingUp className="w-5 h-5 mr-2" /> {stats?.churn_rate?.toFixed(1) || '0.0'}%
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader><CardTitle>Acquisition Volume</CardTitle></CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                                <span className="text-zinc-400">Nodes Activated (30d)</span>
                                <span className="text-xl font-mono">{stats?.nodes_activated || 0}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                                <span className="text-zinc-400">Total Spend (Commissions)</span>
                                <span className="text-xl font-mono text-green-400">${stats?.spend?.toFixed(2) || '0.00'}</span>
                            </div>
                            <div className="mt-4 p-4 bg-zinc-950 rounded-md text-sm text-zinc-500">
                                LTV/CAC Ratio: <span className="text-white font-bold">{stats?.cac > 0 ? (stats.ltv / stats.cac).toFixed(1) : '∞'}x</span>
                                {(stats?.ltv / stats.cac) > 3 && <span className="ml-2 text-green-500">(Healthy)</span>}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
