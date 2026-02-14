"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSSE } from '@/hooks/use-sse';
import {
    Activity, Signal, Zap, Users, Wifi, Terminal,
    AlertCircle, Upload, Cpu, Clock, DollarSign
} from 'lucide-react';
import {
    AreaChart, Area, ResponsiveContainer, Tooltip,
    CartesianGrid, XAxis, YAxis
} from 'recharts';
import { motion } from 'framer-motion';

export default function NodeDashboard() {
    const { user } = useAuth();
    const { lastEvent } = useSSE('/stream/node', ['heartbeat', 'log']);
    const [nodeStatus, setNodeStatus] = useState<any>({
        online: true, uptime: '14d 7h 23m', peers: 12, bandwidth: '1.2 TB',
        earnings: 42.5, latency: 23, cpu: 34, lastPing: Date.now()
    });
    const [logs, setLogs] = useState<string[]>([
        '[BOOT] Node v3.2.1 initialized', '[NET] Peer discovery: 12 peers found',
        '[RELAY] Bandwidth allocation: 1.2 TB', '[EARN] Epoch #4821 reward: 0.42 STK',
    ]);
    const [telemetry, setTelemetry] = useState([
        { t: '00:00', cpu: 28, bw: 120 }, { t: '04:00', cpu: 32, bw: 180 },
        { t: '08:00', cpu: 45, bw: 320 }, { t: '12:00', cpu: 38, bw: 280 },
        { t: '16:00', cpu: 52, bw: 410 }, { t: '20:00', cpu: 34, bw: 190 },
        { t: 'Now', cpu: 34, bw: 220 },
    ]);
    const logRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!lastEvent) return;
        if (lastEvent.type === 'heartbeat') setNodeStatus((p: any) => ({ ...p, ...lastEvent.data, lastPing: Date.now() }));
        if (lastEvent.type === 'log') {
            setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${lastEvent.data.message}`].slice(-50));
            setTimeout(() => logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' }), 50);
        }
    }, [lastEvent]);

    const metrics = [
        { label: 'Uptime', value: nodeStatus.uptime, icon: Clock, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        { label: 'Peers', value: nodeStatus.peers, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        { label: 'Bandwidth', value: nodeStatus.bandwidth, icon: Upload, color: 'text-violet-400', bg: 'bg-violet-500/10' },
        { label: 'Earnings', value: `${nodeStatus.earnings} STK`, icon: DollarSign, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    ];

    return (
        <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-[1440px] mx-auto fade-in">
            {/* ── Hero Status Banner ── */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-900/80 p-5 sm:p-6 glow-shadow">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-500/5 to-transparent rounded-bl-full" />
                <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        {/* Heartbeat Indicator */}
                        <div className="relative">
                            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${nodeStatus.online ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                                <Activity className={`w-6 h-6 ${nodeStatus.online ? 'text-emerald-400' : 'text-red-400'}`} />
                            </div>
                            <span className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-zinc-900 ${nodeStatus.online ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-zinc-50">Node Status</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge className={`text-[10px] ${nodeStatus.online ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-red-500/15 text-red-400 border-red-500/30'}`}>
                                    {nodeStatus.online ? '● ONLINE' : '● OFFLINE'}
                                </Badge>
                                <span className="text-xs text-zinc-600">
                                    Last ping: {Math.round((Date.now() - nodeStatus.lastPing) / 1000)}s ago
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <span className="text-xs text-zinc-500 block">Latency</span>
                            <span className="text-lg font-bold text-zinc-200">{nodeStatus.latency}ms</span>
                        </div>
                        <div className="w-px h-8 bg-zinc-800 hidden sm:block" />
                        <div className="text-right hidden sm:block">
                            <span className="text-xs text-zinc-500 block">CPU Load</span>
                            <span className="text-lg font-bold text-zinc-200">{nodeStatus.cpu}%</span>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ── Metric Strip ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {metrics.map((m, i) => (
                    <Card key={i} className="bg-zinc-900/80 border-zinc-800/60 glow-shadow hover:border-zinc-700/80 transition-all duration-300">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-lg ${m.bg} flex items-center justify-center`}>
                                    <m.icon className={`w-4 h-4 ${m.color}`} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">{m.label}</p>
                                    <p className="text-lg font-bold text-zinc-100 mt-0.5">{m.value}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* ── Telemetry Chart ── */}
            <Card className="bg-zinc-900/80 border-zinc-800/60 glow-shadow">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-zinc-300">Telemetry</CardTitle>
                    <CardDescription className="text-xs text-zinc-600">CPU and bandwidth over 24h</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[200px] sm:h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={telemetry}>
                                <defs>
                                    <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="bwGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                                <XAxis dataKey="t" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={{ stroke: '#27272a' }} />
                                <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={{ stroke: '#27272a' }} />
                                <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fafafa', fontSize: '12px' }} />
                                <Area type="monotone" dataKey="cpu" stroke="#3b82f6" fill="url(#cpuGrad)" strokeWidth={2} name="CPU %" />
                                <Area type="monotone" dataKey="bw" stroke="#10b981" fill="url(#bwGrad)" strokeWidth={2} name="Bandwidth MB/s" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* ── Console ── */}
            <Card className="bg-zinc-900/80 border-zinc-800/60 glow-shadow">
                <CardHeader className="pb-2 border-b border-zinc-800/40">
                    <div className="flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-emerald-400" />
                        <CardTitle className="text-sm font-semibold text-zinc-300">System Console</CardTitle>
                        <span className="ml-auto text-[10px] text-zinc-600 font-mono">{logs.length} entries</span>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div ref={logRef} className="h-[180px] sm:h-[220px] overflow-y-auto scrollbar-thin p-4 font-mono text-xs">
                        {logs.map((log, i) => (
                            <div key={i} className={`py-1 ${log.includes('[ERR') ? 'text-red-400' : log.includes('[WARN') ? 'text-amber-400' : 'text-zinc-400'}`}>
                                <span className="text-zinc-600 mr-2">{String(i + 1).padStart(3, '0')}</span>{log}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
