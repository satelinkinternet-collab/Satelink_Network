"use client";

import { useState } from 'react';
import {
    Search,
    RefreshCcw,
    Zap,
    Scale,
    AlertTriangle,
    CheckCircle2,
    Clock,
    User,
    Wifi
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function ReplayTool() {
    const [fromTs, setFromTs] = useState('');
    const [toTs, setToTs] = useState('');
    const [partnerId, setPartnerId] = useState('');
    const [nodeId, setNodeId] = useState('');
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState<any>(null);

    const runReplay = async () => {
        if (!fromTs || !toTs) {
            toast.error("Please enter both start and end timestamps");
            return;
        }

        setRunning(true);
        setResult(null);

        try {
            const query = new URLSearchParams({
                from_ts: Math.floor(new Date(fromTs).getTime() / 1000).toString(),
                to_ts: Math.floor(new Date(toTs).getTime() / 1000).toString(),
            });

            if (partnerId) query.append('partner_id', partnerId);
            if (nodeId) query.append('node_id', nodeId);

            const res = await fetch(`/api/admin/forensics/replay?${query}`);
            const data = await res.json();

            if (data.ok) {
                setResult(data);
                toast.success("Replay completed successfully");
            } else {
                toast.error(data.error || "Replay failed");
            }
        } catch (e) {
            toast.error("Network error during replay");
        } finally {
            setRunning(false);
        }
    };

    return (
        <div className="p-8 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                    <Search className="h-8 w-8 text-blue-500" />
                    Deterministic Replay Engine
                </h1>
                <p className="text-zinc-400 mt-1">Verify revenue and reward calculations against the immutable source ledger.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Configuration Sidebar */}
                <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm h-fit">
                    <CardHeader>
                        <CardTitle className="text-lg text-white">Investigation Parameters</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Start Time</label>
                            <Input
                                type="datetime-local"
                                className="bg-zinc-800/50 border-zinc-700 text-white"
                                value={fromTs}
                                onChange={(e) => setFromTs(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">End Time</label>
                            <Input
                                type="datetime-local"
                                className="bg-zinc-800/50 border-zinc-700 text-white"
                                value={toTs}
                                onChange={(e) => setToTs(e.target.value)}
                            />
                        </div>
                        <hr className="border-zinc-800" />
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Partner Wallet (Optional)</label>
                            <Input
                                placeholder="0x..."
                                className="bg-zinc-800/50 border-zinc-700 text-white"
                                value={partnerId}
                                onChange={(e) => setPartnerId(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Node ID (Optional)</label>
                            <Input
                                placeholder="node_..."
                                className="bg-zinc-800/50 border-zinc-700 text-white"
                                value={nodeId}
                                onChange={(e) => setNodeId(e.target.value)}
                            />
                        </div>
                        <Button
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white mt-4 shadow-lg shadow-blue-500/20"
                            disabled={running}
                            onClick={runReplay}
                        >
                            {running ? (
                                <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Zap className="h-4 w-4 mr-2" />
                            )}
                            {running ? 'Computing...' : 'Initialize Replay'}
                        </Button>
                    </CardContent>
                </Card>

                {/* Main Result Area */}
                <div className="lg:col-span-3 space-y-6">
                    {!result && !running && (
                        <div className="h-[400px] flex flex-col items-center justify-center text-zinc-500 border-2 border-dashed border-zinc-800 rounded-3xl">
                            <Clock className="h-12 w-12 mb-4 opacity-20" />
                            <p className="text-lg font-medium">No replay results to display</p>
                            <p className="text-sm">Configure parameters and start the engine</p>
                        </div>
                    )}

                    {running && (
                        <div className="h-[400px] flex flex-col items-center justify-center text-zinc-500 bg-zinc-900/50 border-zinc-800 rounded-3xl animate-pulse">
                            <RefreshCcw className="h-12 w-12 mb-4 animate-spin text-blue-500/50" />
                            <p className="text-lg font-medium text-white">Replaying Transaction Log...</p>
                            <p className="text-sm">Aggregating ops and verifying against ledger</p>
                        </div>
                    )}

                    {result && (
                        <div className="space-y-6 animate-in zoom-in-95 duration-500">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Card className="bg-zinc-900 border-zinc-800">
                                    <CardContent className="pt-6">
                                        <div className="text-zinc-500 text-xs uppercase font-bold tracking-widest mb-1">Computed Revenue</div>
                                        <div className="text-3xl font-bold text-white font-mono">${result.computed.revenue_usdt.toFixed(4)}</div>
                                        <div className="text-zinc-500 text-[10px] mt-2">Aggregated from {result.computed.ops_total} events</div>
                                    </CardContent>
                                </Card>
                                <Card className="bg-zinc-900 border-zinc-800">
                                    <CardContent className="pt-6">
                                        <div className="text-zinc-500 text-xs uppercase font-bold tracking-widest mb-1">Ledger Actual</div>
                                        <div className="text-3xl font-bold text-white font-mono">${result.ledger.revenue_usdt.toFixed(4)}</div>
                                        <div className="text-zinc-500 text-[10px] mt-2 flex items-center gap-1">
                                            <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Source: Ledger History
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className={`bg-zinc-900 border-zinc-800 border-t-4 ${result.variance.revenue_usdt_diff_pct > 0.1 ? 'border-t-red-500' : 'border-t-emerald-500'}`}>
                                    <CardContent className="pt-6">
                                        <div className="text-zinc-500 text-xs uppercase font-bold tracking-widest mb-1">Variance</div>
                                        <div className={`text-3xl font-bold font-mono ${result.variance.revenue_usdt_diff_pct > 0.1 ? 'text-red-500' : 'text-emerald-500'}`}>
                                            {result.variance.revenue_usdt_diff_pct.toFixed(4)}%
                                        </div>
                                        <Badge className={`text-[10px] mt-2 ${result.variance.revenue_usdt_diff_pct > 0.1 ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                            {result.variance.revenue_usdt_diff_pct > 0.1 ? 'INVESTIGATION REQ' : 'DETERMINISTIC'}
                                        </Badge>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Breakdown */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Card className="bg-zinc-900/50 border-zinc-800">
                                    <CardHeader>
                                        <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                                            <User className="h-4 w-4 text-blue-500" />
                                            Top Partners in Window
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {result.computed.breakdown_by_partner.slice(0, 5).map((p: any) => (
                                                <div key={p.id} className="flex justify-between items-center text-sm p-2 rounded-lg bg-zinc-800/50">
                                                    <span className="font-mono text-zinc-400">{p.id.slice(0, 10)}...</span>
                                                    <span className="text-white font-semibold">${p.amount_usdt.toFixed(2)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="bg-zinc-900/50 border-zinc-800">
                                    <CardHeader>
                                        <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                                            <Wifi className="h-4 w-4 text-emerald-500" />
                                            Top Nodes in Window
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {result.computed.breakdown_by_node.slice(0, 5).map((n: any) => (
                                                <div key={n.id} className="flex justify-between items-center text-sm p-2 rounded-lg bg-zinc-800/50">
                                                    <span className="font-mono text-zinc-400">{n.id}</span>
                                                    <span className="text-white font-semibold">${n.amount_usdt.toFixed(2)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Proof Footer */}
                            <Card className="bg-zinc-900 border-zinc-800 overflow-hidden relative">
                                <CardContent className="pt-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <Scale className="h-5 w-5 text-zinc-500" />
                                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">Forensic Proof Package</h3>
                                    </div>
                                    <div className="bg-black/50 p-4 rounded-xl border border-zinc-800 font-mono text-[10px] text-emerald-500/80 break-all">
                                        PROOF_HASH: {result.proof_hash}
                                        <br />
                                        CANONICAL_JSON v1.0.0
                                    </div>
                                    <p className="text-[10px] text-zinc-500 mt-4 leading-relaxed">
                                        This proof hash can be verified by stringifying the output object using stable key ordering and computing SHA256.
                                        Any modification to the data will result in a different hash.
                                    </p>
                                </CardContent>
                                <div className="absolute top-0 right-0 p-4">
                                    <Badge variant="outline" className="text-[8px] border-zinc-700 text-zinc-500 uppercase">Tamper Evident</Badge>
                                </div>
                            </Card>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
