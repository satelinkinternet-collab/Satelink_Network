"use client";

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
    Building2,
    BarChart,
    FileText,
    CreditCard,
    Download,
    ArrowUpRight,
    ShieldCheck,
    History,
    Loader2
} from 'lucide-react';

export default function EnterpriseDashboard() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        try {
            const { data } = await api.get('/ent-api/stats');
            if (data.ok) {
                setData(data);
            }
        } catch (err) {
            toast.error('Failed to fetch enterprise stats');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    if (loading && !data) return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
    );

    const usage = data?.usage;

    return (
        <div className="space-y-6 text-zinc-100">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Enterprise Portal</h2>
                    <p className="text-zinc-400">Manage high-scale deployments and billing.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="border-zinc-800 text-zinc-400 hover:text-zinc-100">
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        SLA Report
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                        <Download className="mr-2 h-4 w-4" />
                        Usage CSV
                    </Button>
                </div>
            </div>

            {/* Usage Analytics Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Monthly Operations</CardTitle>
                        <BarChart className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{usage?.currentMonthOps.toLocaleString()}</div>
                        <p className="text-xs text-blue-400 mt-1">On track for 15k limit</p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Current Spend</CardTitle>
                        <CreditCard className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${usage?.projectedSpend.toFixed(2)}</div>
                        <p className="text-xs text-zinc-500 mt-1">Billed at end of month</p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Active Proj. Keys</CardTitle>
                        <Building2 className="h-4 w-4 text-zinc-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{usage?.activeKeys}</div>
                        <p className="text-xs text-zinc-500 mt-1">Multi-region active</p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Last Invoice</CardTitle>
                        <History className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${usage?.lastMonthSpend.toFixed(2)}</div>
                        <Badge className="mt-1 bg-zinc-800 text-zinc-400 border-zinc-700">PAID</Badge>
                    </CardContent>
                </Card>
            </div>

            {/* Billable Usage Section */}
            <div className="grid gap-6 md:grid-cols-3">
                <Card className="md:col-span-2 bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-lg">Recent Invoices</CardTitle>
                        <CardDescription className="text-zinc-500">View and download your monthly service invoices.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader className="border-zinc-800">
                                <TableRow className="hover:bg-transparent border-zinc-800">
                                    <TableHead className="text-zinc-400 text-xs text-zinc-300">Invoice ID</TableHead>
                                    <TableHead className="text-zinc-400 text-xs">Due Date</TableHead>
                                    <TableHead className="text-zinc-400 text-xs">Amount</TableHead>
                                    <TableHead className="text-zinc-400 text-xs">Status</TableHead>
                                    <TableHead className="text-right text-zinc-400 text-xs"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data?.invoices.map((inv: any) => (
                                    <TableRow key={inv.id} className="border-zinc-800 hover:bg-zinc-800/50">
                                        <TableCell className="font-medium text-sm text-zinc-300">{inv.id}</TableCell>
                                        <TableCell className="text-sm text-zinc-500">{inv.date}</TableCell>
                                        <TableCell className="text-sm font-bold text-zinc-100">${inv.amount.toFixed(2)}</TableCell>
                                        <TableCell>
                                            <Badge className={inv.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'}>
                                                {inv.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-zinc-100">
                                                <Download className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Support Card */}
                <Card className="bg-zinc-900 border-zinc-800 flex flex-col justify-center items-center p-6 text-center space-y-4">
                    <div className="p-4 rounded-full bg-blue-600/10 text-blue-500">
                        <FileText className="h-10 w-10" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="font-bold text-lg">Enterprise Support</h3>
                        <p className="text-xs text-zinc-500 leading-relaxed px-4">
                            Your dedicated account manager is available for custom infrastructure requests and SLA reviews.
                        </p>
                    </div>
                    <Button className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100 mt-4 border border-zinc-700">
                        Contact Support
                    </Button>
                </Card>
            </div>
        </div>
    );
}
