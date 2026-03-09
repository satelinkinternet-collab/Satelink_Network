"use client";

import { useState, useEffect } from 'react';
import {
    AlertCircle,
    ChevronLeft,
    RefreshCcw,
    MessageSquare,
    Search,
    CheckCircle2,
    Clock,
    User,
    ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import Link from 'next/link';

export default function DisputeManagement() {
    const [disputes, setDisputes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDisputes();
    }, []);

    const fetchDisputes = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/forensics/disputes');
            const data = await res.json();
            if (data.ok) setDisputes(data.disputes);
        } catch (e) {
            toast.error("Failed to load disputes");
        } finally {
            setLoading(false);
        }
    };

    const resolveDispute = async (id: number) => {
        const notes = prompt("Enter resolution notes:");
        if (!notes) return;

        try {
            const res = await fetch(`/api/admin/forensics/disputes/${id}/resolve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes })
            });
            const data = await res.json();
            if (data.ok) {
                toast.success("Dispute resolved");
                fetchDisputes();
            }
        } catch (e) {
            toast.error("Failed to resolve dispute");
        }
    };

    return (
        <div className="p-8 space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Link href="/admin/forensics">
                        <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                            <MessageSquare className="h-6 w-6 text-amber-500" />
                            Partner Disputes
                        </h1>
                        <p className="text-zinc-500 text-sm">Formal discrepancy reports and automated forensic investigations.</p>
                    </div>
                </div>
                <Button variant="outline" className="border-zinc-800 text-zinc-300" onClick={fetchDisputes}>
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            <div className="space-y-4">
                {loading ? (
                    [1, 2].map(i => <Card key={i} className="h-32 bg-zinc-900 border-zinc-800 animate-pulse" />)
                ) : disputes.length === 0 ? (
                    <div className="h-60 flex flex-col items-center justify-center text-zinc-500 border-2 border-dashed border-zinc-800 rounded-3xl bg-zinc-900/50">
                        <AlertCircle className="h-12 w-12 mb-4 opacity-20" />
                        <p className="text-sm">No active disputes found.</p>
                    </div>
                ) : (
                    disputes.map(dispute => (
                        <Card key={dispute.id} className="bg-zinc-900/50 border-zinc-800 overflow-hidden border-l-4 border-l-amber-500">
                            <CardContent className="p-0">
                                <div className="p-6 flex items-start justify-between">
                                    <div className="space-y-4 flex-1">
                                        <div className="flex items-center gap-3">
                                            <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 uppercase text-[10px] font-bold">
                                                {dispute.status}
                                            </Badge>
                                            <span className="text-zinc-500 text-xs flex items-center gap-1">
                                                <Clock className="h-3 w-3" /> {new Date(dispute.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 text-white font-bold text-lg">
                                                <User className="h-4 w-4 text-zinc-400" /> {dispute.partner_id.slice(0, 10)}...
                                            </div>
                                            <p className="text-zinc-400 text-sm mt-1 max-w-2xl">{dispute.reason}</p>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                                                Window: {new Date(dispute.from_ts * 1000).toLocaleDateString()} to {new Date(dispute.to_ts * 1000).toLocaleDateString()}
                                            </div>
                                            {dispute.forensic_report_json && (
                                                <Badge variant="outline" className="bg-blue-500/5 text-blue-400 border-blue-500/20 text-[10px]">
                                                    <Search className="h-3 w-3 mr-1" /> Forensic Report Attached
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {dispute.status !== 'resolved' && (
                                            <Button size="sm" className="bg-zinc-800 hover:bg-emerald-600 text-white" onClick={() => resolveDispute(dispute.id)}>
                                                Mark Resolved
                                            </Button>
                                        )}
                                        <Button size="sm" variant="ghost" className="text-zinc-500 hover:text-white">
                                            View Report <ArrowRight className="h-3 w-3 ml-2" />
                                        </Button>
                                    </div>
                                </div>
                                {dispute.resolved_at && (
                                    <div className="bg-zinc-800/30 p-4 border-t border-zinc-800 flex items-center gap-4">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                        <div>
                                            <div className="text-[10px] text-emerald-500 font-bold uppercase">Resolution Notes</div>
                                            <div className="text-sm text-zinc-400">{dispute.resolution_notes}</div>
                                        </div>
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
