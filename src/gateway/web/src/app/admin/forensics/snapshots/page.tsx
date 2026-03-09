"use client";

import { useState, useEffect } from 'react';
import {
    FileJson,
    ChevronLeft,
    Search,
    CheckCircle2,
    Calendar,
    ArrowUpRight,
    RefreshCcw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import Link from 'next/link';

export default function SnapshotsList() {
    const [snapshots, setSnapshots] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSnapshots();
    }, []);

    const fetchSnapshots = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/forensics/snapshots?days=60');
            const data = await res.json();
            if (data.ok) setSnapshots(data.snapshots);
        } catch (e) {
            toast.error("Failed to load snapshots");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Link href="/admin/forensics">
                    <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">State Snapshots</h1>
                    <p className="text-zinc-500 text-sm">Historical archive of daily system summaries.</p>
                </div>
            </div>

            <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="border-b border-zinc-800 pb-4">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-sm font-bold uppercase tracking-widest text-zinc-400">Snapshot Archive</CardTitle>
                        <Button variant="outline" size="sm" className="border-zinc-800 h-8" onClick={fetchSnapshots}>
                            <RefreshCcw className="h-3 w-3 mr-2" />
                            Refresh
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white/5 border-b border-zinc-800">
                                <tr>
                                    <th className="px-6 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Day</th>
                                    <th className="px-6 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Proof Hash</th>
                                    <th className="px-6 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Captured At</th>
                                    <th className="px-6 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-3 text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {loading ? (
                                    [1, 2, 3, 4, 5].map(i => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-6 py-4"><div className="h-4 w-24 bg-zinc-800 rounded" /></td>
                                            <td className="px-6 py-4"><div className="h-4 w-48 bg-zinc-800 rounded" /></td>
                                            <td className="px-6 py-4"><div className="h-4 w-32 bg-zinc-800 rounded" /></td>
                                            <td className="px-6 py-4"><div className="h-4 w-16 bg-zinc-800 rounded" /></td>
                                            <td className="px-6 py-4 text-right"><div className="h-8 w-8 bg-zinc-800 rounded ml-auto" /></td>
                                        </tr>
                                    ))
                                ) : snapshots.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 italic">No snapshots available.</td>
                                    </tr>
                                ) : (
                                    snapshots.map(snap => (
                                        <tr key={snap.id} className="hover:bg-white/5 group transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-white font-medium">
                                                    <Calendar className="h-3 w-3 text-zinc-500" />
                                                    {snap.day_yyyymmdd}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-xs text-zinc-500 truncate max-w-[200px]">
                                                {snap.hash_proof}
                                            </td>
                                            <td className="px-6 py-4 text-xs text-zinc-400">
                                                {new Date(snap.created_at).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-2 py-0 text-[10px]">
                                                    <CheckCircle2 className="h-3 w-3 mr-1" /> VERIFIED
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Link href={`/admin/forensics/snapshots/${snap.day_yyyymmdd}`}>
                                                    <Button variant="ghost" size="sm" className="h-8 text-blue-400 hover:text-blue-300">
                                                        Inspect <ArrowUpRight className="h-3 w-3 ml-1" />
                                                    </Button>
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
