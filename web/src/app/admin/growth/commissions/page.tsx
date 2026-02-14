
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Users } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader } from '@/components/admin/admin-shared';

export default function CommissionsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/admin/revenue/commissions').then(res => {
            if (res.data.ok) setData(res.data);
        }).finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
            <PageHeader title="Distributor Commissions" subtitle="Partner performance and payout accruals" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-zinc-400">Total Accrued (Unpaid)</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white">${data?.stats?.total_accrued?.toFixed(2) || '0.00'}</div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-zinc-400">Active Distributors</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white">{data?.stats?.distributors?.length || 0}</div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-zinc-400">Fraud Alerts</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-yellow-500">{data?.fraud?.alerts?.length || 0}</div>
                    </CardContent>
                </Card>
            </div>

            {data?.fraud?.alerts?.length > 0 && (
                <Card className="bg-yellow-900/10 border-yellow-800">
                    <CardHeader><CardTitle className="text-yellow-500 flex items-center"><AlertCircle className="w-5 h-5 mr-2" /> Fraud / Risk Signals</CardTitle></CardHeader>
                    <CardContent>
                        <ul className="list-disc pl-5 text-yellow-200/80 space-y-1">
                            {data.fraud.alerts.map((a: string, i: number) => <li key={i}>{a}</li>)}
                        </ul>
                    </CardContent>
                </Card>
            )}

            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader><CardTitle>Top Distributors</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="border-zinc-800">
                                <TableHead className="text-zinc-400">Wallet</TableHead>
                                <TableHead className="text-right text-zinc-400">Referrals (Active)</TableHead>
                                <TableHead className="text-right text-zinc-400">Total Earned</TableHead>
                                <TableHead className="text-right text-zinc-400">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data?.stats?.distributors?.map((d: any, i: number) => (
                                <TableRow key={i} className="border-zinc-800">
                                    <TableCell className="font-mono text-xs">{d.distributor_wallet}</TableCell>
                                    <TableCell className="text-right">{d.count}</TableCell>
                                    <TableCell className="text-right text-green-400">${d.total.toFixed(2)}</TableCell>
                                    <TableCell className="text-right"><Badge variant="outline" className="border-green-800 text-green-400">Active</Badge></TableCell>
                                </TableRow>
                            ))}
                            {!data?.stats?.distributors?.length && (
                                <TableRow><TableCell colSpan={4} className="text-center py-6 text-zinc-500">No active distributors found</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
