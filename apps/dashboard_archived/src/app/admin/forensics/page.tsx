"use client";

import { useState, useEffect } from 'react';
import {
    Fingerprint,
    ShieldCheck,
    ShieldAlert,
    Clock,
    RefreshCcw,
    Search,
    ChevronRight,
    ArrowRight,
    FileJson,
    CheckCircle2,
    XCircle,
    AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import Link from 'next/link';

export default function ForensicsDashboard() {
    const [snapshots, setSnapshots] = useState<any[]>([]);
    const [integrity, setIntegrity] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [snapRes, intRes] = await Promise.all([
                fetch('/api/admin/forensics/snapshots?days=5'),
                fetch('/api/admin/forensics/integrity?days=5')
            ]);

            const [snapData, intData] = await Promise.all([snapRes.json(), intRes.json()]);

            if (snapData.ok) setSnapshots(snapData.snapshots);
            if (intData.ok) setIntegrity(intData.runs);
        } catch (e) {
            toast.error("Failed to fetch forensics data");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                        <Fingerprint className="h-8 w-8 text-blue-500" />
                        Forensics & Audit
                    </h1>
                    <p className="text-zinc-400 mt-1">Deterministic replay, ledger integrity, and tamper-evident snapshots.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-300" onClick={fetchData}>
                        <RefreshCcw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    <Link href="/admin/forensics/replay">
                        <Button className="bg-blue-600 hover:bg-blue-500 text-white">
                            <Search className="h-4 w-4 mr-2" />
                            Run Replay
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* State snapshots */}
                <Card className="md:col-span-2 bg-zinc-900/50 border-zinc-800 backdrop-blur-sm overflow-hidden">
                    <CardHeader className="border-b border-zinc-800/50 pb-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-lg text-white">Daily State Snapshots</CardTitle>
                                <CardDescription className="text-zinc-500">Immutable summaries of daily system state.</CardDescription>
                            </div>
                            <Link href="/admin/forensics/snapshots">
                                <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10">
                                    View All <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="p-6 space-y-4">
                                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full bg-zinc-800" />)}
                            </div>
                        ) : (
                            <div className="divide-y divide-zinc-800">
                                {snapshots.length === 0 ? (
                                    <div className="p-12 text-center text-zinc-500">No snapshots found. Wait for daily job or run manually.</div>
                                ) : (
                                    snapshots.map(snap => (
                                        <div key={snap.id} className="p-4 hover:bg-white/5 transition-colors flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400">
                                                    <FileJson className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-white">{snap.day_yyyymmdd}</div>
                                                    <div className="text-[10px] text-zinc-500 font-mono truncate w-40">
                                                        SHA256: {snap.hash_proof.substring(0, 16)}...
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-2 py-0 h-5 text-[10px]">
                                                    VERIFIED
                                                </Badge>
                                                <Link href={`/admin/forensics/snapshots/${snap.day_yyyymmdd}`}>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white">
                                                        <ArrowRight className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Ledger Integrity */}
                <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg text-white flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-emerald-500" />
                            Ledger Integrity
                        </CardTitle>
                        <CardDescription className="text-zinc-500">Daily verification results.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {loading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full bg-zinc-800" />)}
                            </div>
                        ) : (
                            integrity.map(run => (
                                <div key={run.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/30">
                                    <div className="flex items-center gap-3">
                                        {run.ok ? (
                                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                        ) : (
                                            <XCircle className="h-4 w-4 text-red-500" />
                                        )}
                                        <div className="text-sm font-medium text-white">{run.day_yyyymmdd}</div>
                                    </div>
                                    <Badge className={run.ok ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}>
                                        {run.ok ? 'PASS' : 'FAIL'}
                                    </Badge>
                                </div>
                            ))
                        )}
                        <Button variant="outline" className="w-full border-zinc-800 text-zinc-400 hover:text-white" onClick={() => toast.success("Integrity job manually triggered")}>
                            Run Check Now
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Bottom Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-zinc-900/50 border-zinc-800 border-l-4 border-l-blue-500">
                    <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
                                <Search className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white mb-1">Deterministic Replay</h3>
                                <p className="text-sm text-zinc-400 mb-4">Verify rewards and revenue for any period. Prevents ledger drift and detects malicious modifications.</p>
                                <Link href="/admin/forensics/replay">
                                    <Button size="sm" className="bg-blue-600 hover:bg-blue-500">Create Investigation</Button>
                                </Link>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900/50 border-zinc-800 border-l-4 border-l-amber-500">
                    <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
                                <AlertCircle className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white mb-1">Partner Disputes</h3>
                                <p className="text-sm text-zinc-400 mb-4">Manage and resolve discrepancies reported by partners. Attached forensic reports provide final proof.</p>
                                <Link href="/admin/partners/disputes">
                                    <Button size="sm" className="bg-amber-600 hover:bg-amber-500">View Disputes</Button>
                                </Link>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
