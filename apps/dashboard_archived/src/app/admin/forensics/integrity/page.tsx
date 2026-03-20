"use client";

import { useState, useEffect } from 'react';
import {
    ShieldCheck,
    ChevronLeft,
    RefreshCcw,
    CheckCircle2,
    XCircle,
    Info,
    History
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import Link from 'next/link';

export default function IntegrityHistory() {
    const [runs, setRuns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRuns();
    }, []);

    const fetchRuns = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/forensics/integrity?days=60');
            const data = await res.json();
            if (data.ok) setRuns(data.runs);
        } catch (e) {
            toast.error("Failed to load integrity history");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 space-y-6 animate-in slide-in-from-left-4 duration-500">
            <div className="flex items-center gap-4">
                <Link href="/admin/forensics">
                    <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                        <ShieldCheck className="h-6 w-6 text-emerald-500" />
                        Ledger Integrity Runs
                    </h1>
                    <p className="text-zinc-500 text-sm">History of zero-variance checks between event logs and final ledger.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    [1, 2, 3].map(i => <Card key={i} className="h-24 bg-zinc-900 border-zinc-800 animate-pulse" />)
                ) : runs.length === 0 ? (
                    <div className="h-60 flex flex-col items-center justify-center text-zinc-500 border-2 border-dashed border-zinc-800 rounded-3xl bg-zinc-900/50">
                        <History className="h-12 w-12 mb-4 opacity-20" />
                        <p className="text-sm">No integrity runs recorded yet.</p>
                    </div>
                ) : (
                    runs.map(run => (
                        <Card key={run.id} className={`bg-zinc-900/50 border-zinc-800 overflow-hidden ${!run.ok ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-emerald-500'}`}>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-lg ${run.ok ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                            {run.ok ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                                        </div>
                                        <div>
                                            <div className="text-lg font-bold text-white">{run.day_yyyymmdd}</div>
                                            <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
                                                RUN ON: {new Date(run.created_at).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        {run.findings.length > 0 && (
                                            <div className="flex -space-x-2">
                                                {run.findings.map((f: string, i: number) => (
                                                    <div key={i} className="w-6 h-6 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-[10px] text-red-500 font-bold" title={f}>
                                                        !
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <Badge className={`px-4 py-1 font-bold ${run.ok ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                                            {run.ok ? 'PASSED' : 'FAILED'}
                                        </Badge>
                                    </div>
                                </div>

                                {run.findings.length > 0 && (
                                    <div className="mt-4 p-3 bg-red-500/5 rounded-lg border border-red-500/10 space-y-1">
                                        <div className="text-[10px] font-bold text-red-400 uppercase tracking-widest flex items-center gap-1 mb-2">
                                            <Info className="h-3 w-3" /> Findings
                                        </div>
                                        {run.findings.map((f: string, i: number) => (
                                            <div key={i} className="text-xs text-zinc-400 flex items-start gap-2">
                                                <span className="text-red-500">•</span>
                                                {f}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
