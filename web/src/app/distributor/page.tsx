"use client";

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
    Users,
    TrendingUp,
    Share2,
    Copy,
    QrCode,
    DollarSign,
    ExternalLink,
    ChevronRight,
    Loader2
} from 'lucide-react';

export default function DistributorDashboard() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        try {
            const [statsRes, refsRes, convsRes] = await Promise.all([
                api.get('/dist-api/stats'),
                api.get('/dist-api/referrals'),
                api.get('/dist-api/conversions')
            ]);

            if (statsRes.data.ok) {
                setData({
                    ...statsRes.data,
                    referrals: refsRes.data.referrals || [],
                    conversions: convsRes.data.conversions || []
                });
            }
        } catch (err) {
            toast.error('Failed to fetch distributor stats');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const copyRefLink = () => {
        if (data?.stats.referralLink) {
            navigator.clipboard.writeText(data.stats.referralLink);
            toast.success('Referral link copied to clipboard');
        }
    };

    if (loading && !data) return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
    );

    const stats = data?.stats;

    return (
        <div className="space-y-6 text-zinc-100">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Referral & Distribution</h2>
                    <p className="text-zinc-400">Track your network growth and community earnings.</p>
                </div>
                <Button onClick={copyRefLink} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                    <Share2 className="mr-2 h-4 w-4" />
                    Share Referral Link
                </Button>
            </div>

            {/* Referral Link Card */}
            <Card className="bg-zinc-900 border-zinc-800 border-dashed border-2">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="p-4 bg-zinc-800 rounded-xl">
                            <QrCode className="h-24 w-24 text-zinc-300" />
                        </div>
                        <div className="flex-1 space-y-4 text-center md:text-left">
                            <div>
                                <h3 className="font-bold text-lg">Your Unique Referral Link</h3>
                                <p className="text-zinc-400 text-sm">Earn commissions on every node referred to the network.</p>
                            </div>
                            <div className="flex items-center gap-2 max-w-lg mx-auto md:mx-0">
                                <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 font-mono text-sm text-blue-400 truncate">
                                    {stats?.referralLink}
                                </div>
                                <Button variant="outline" size="icon" onClick={copyRefLink} className="border-zinc-800">
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Total Referrals</CardTitle>
                        <Users className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.referralCount}</div>
                        <p className="text-xs text-zinc-500 mt-1">Active nodes in network</p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Claimable Earnings</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${stats?.claimable}</div>
                        <p className="text-xs text-green-500 mt-1">Ready for withdrawal</p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Total Commissions</CardTitle>
                        <TrendingUp className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${stats?.totalEarned}</div>
                        <p className="text-xs text-zinc-500 mt-1">Lifetime referral rewards</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Referrals table */}
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-lg">Recent Referrals</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader className="border-zinc-800">
                                <TableRow className="hover:bg-transparent border-zinc-800">
                                    <TableHead className="text-zinc-400 text-xs">Wallet</TableHead>
                                    <TableHead className="text-zinc-400 text-xs">Status</TableHead>
                                    <TableHead className="text-right text-zinc-400 text-xs">Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data?.referrals.map((r: any) => (
                                    <TableRow key={r.id} className="border-zinc-800 hover:bg-zinc-800/50">
                                        <TableCell className="font-mono text-xs text-zinc-300">{r.referee_wallet.slice(0, 8)}...</TableCell>
                                        <TableCell>
                                            <Badge className={r.status === 'activated' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-zinc-800 text-zinc-500'}>
                                                {r.status.toUpperCase()}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right text-xs text-zinc-500">
                                            {new Date(r.created_at).toLocaleDateString()}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {data?.referrals.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center py-4 text-xs text-zinc-500">No referrals yet.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Pool Earnings / Conversions (Swapped for Conversions as requested) */}
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-lg">Verified Conversions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader className="border-zinc-800">
                                <TableRow className="hover:bg-transparent border-zinc-800">
                                    <TableHead className="text-zinc-400 text-xs">Wallet</TableHead>
                                    <TableHead className="text-zinc-400 text-xs text-right">Activated</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data?.conversions.map((c: any) => (
                                    <TableRow key={c.id} className="border-zinc-800 hover:bg-zinc-800/50">
                                        <TableCell className="font-mono text-xs text-zinc-300">{c.referee_wallet.slice(0, 8)}...</TableCell>
                                        <TableCell className="text-right text-xs text-green-500">
                                            {new Date(c.created_at).toLocaleDateString()}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {data?.conversions.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center py-4 text-xs text-zinc-500">No conversions.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
