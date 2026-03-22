"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import {
    Activity, Cpu, Shield, Clock, Zap, AlertTriangle,
    RefreshCw, Play, Pause, CheckCircle, XCircle,
    Server, Brain, Gauge, FileSearch, Wrench, TestTube,
    Loader2
} from 'lucide-react';
import {
    PageHeader, ErrorBanner, useIsReadonly, timeAgo
} from '@/components/admin/admin-shared';

/**
 * Agent Control Centre
 *
 * Displays the real-time status of all 10 platform agents:
 * 1. Operations Engine       6. AutoOps Engine
 * 2. Runtime Monitor         7. SLA Engine
 * 3. Safe Mode Autopilot     8. Scheduler
 * 4. Settlement Engine       9. Self-Test Runner
 * 5. Economic Ledger        10. Drills Service
 */

interface AgentStatus {
    name: string;
    id: string;
    status: 'running' | 'paused' | 'stopped' | 'error' | 'unknown';
    lastHeartbeat: number | null;
    opsProcessed?: number;
    errorCount?: number;
    uptime?: string;
    description: string;
    icon: React.ElementType;
}

const AGENT_DEFINITIONS: Omit<AgentStatus, 'status' | 'lastHeartbeat' | 'opsProcessed' | 'errorCount' | 'uptime'>[] = [
    { name: 'Operations Engine', id: 'ops_engine', description: 'Core revenue pipeline — executes all workload operations', icon: Cpu },
    { name: 'Runtime Monitor', id: 'runtime_monitor', description: 'Watches system health, latency, and error rates in real-time', icon: Activity },
    { name: 'Safe Mode Autopilot', id: 'safe_mode', description: 'Auto-freezes system on >50 errors/5min; protects economic integrity', icon: Shield },
    { name: 'Settlement Engine', id: 'settlement_engine', description: 'Batches and settles earnings to on-chain contracts', icon: Zap },
    { name: 'Economic Ledger', id: 'economic_ledger', description: 'Maintains double-entry accounting for all revenue flows', icon: Gauge },
    { name: 'AutoOps Engine', id: 'autoops_engine', description: 'Automated operational tasks: cleanup, archival, maintenance', icon: Wrench },
    { name: 'SLA Engine', id: 'sla_engine', description: 'Monitors and enforces node SLA compliance thresholds', icon: FileSearch },
    { name: 'Scheduler', id: 'scheduler', description: 'Cron-based task scheduler for epoch finalization and batch jobs', icon: Clock },
    { name: 'Self-Test Runner', id: 'self_test', description: 'Periodic self-diagnostics for system integrity verification', icon: TestTube },
    { name: 'Drills Service', id: 'drills_service', description: 'Runs chaos drills and resilience tests on infrastructure', icon: Brain },
];

const statusConfig: Record<string, { color: string; bg: string; label: string; icon: React.ElementType }> = {
    running: { color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30', label: 'RUNNING', icon: CheckCircle },
    paused: { color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/30', label: 'PAUSED', icon: Pause },
    stopped: { color: 'text-zinc-500', bg: 'bg-zinc-500/15 border-zinc-500/30', label: 'STOPPED', icon: XCircle },
    error: { color: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30', label: 'ERROR', icon: AlertTriangle },
    unknown: { color: 'text-zinc-600', bg: 'bg-zinc-800 border-zinc-700', label: 'UNKNOWN', icon: Server },
};

export default function AgentControlCentrePage() {
    const [agents, setAgents] = useState<AgentStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const readonly = useIsReadonly();

    const fetchAgentStatus = useCallback(async () => {
        try {
            setError('');
            const res = await api.get('/admin/agents/status');
            if (res.data.ok && res.data.agents) {
                const merged = AGENT_DEFINITIONS.map(def => {
                    const live = res.data.agents.find((a: any) => a.id === def.id) || {};
                    return {
                        ...def,
                        status: live.status || 'unknown',
                        lastHeartbeat: live.lastHeartbeat || null,
                        opsProcessed: live.opsProcessed || 0,
                        errorCount: live.errorCount || 0,
                        uptime: live.uptime || '--',
                    };
                });
                setAgents(merged);
            } else {
                // Backend may not have agent status endpoint yet — show definitions with unknown status
                setAgents(AGENT_DEFINITIONS.map(def => ({
                    ...def,
                    status: 'unknown' as const,
                    lastHeartbeat: null,
                    opsProcessed: 0,
                    errorCount: 0,
                    uptime: '--',
                })));
            }
        } catch (e: any) {
            // Gracefully handle missing endpoint
            setAgents(AGENT_DEFINITIONS.map(def => ({
                ...def,
                status: 'unknown' as const,
                lastHeartbeat: null,
                opsProcessed: 0,
                errorCount: 0,
                uptime: '--',
            })));
            if (e.response?.status !== 404) {
                setError(e.response?.data?.error || 'Failed to fetch agent status');
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAgentStatus(); }, [fetchAgentStatus]);

    const runningCount = agents.filter(a => a.status === 'running').length;
    const errorCount = agents.filter(a => a.status === 'error').length;
    const totalAgents = agents.length;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
            <PageHeader
                title="Agent Control Centre"
                subtitle="Monitor and manage all platform autonomous agents"
                actions={
                    <Button variant="ghost" size="sm" onClick={fetchAgentStatus} className="text-zinc-400 hover:text-zinc-200">
                        <RefreshCw className="h-4 w-4 mr-1" /> Refresh
                    </Button>
                }
            />

            {error && <ErrorBanner message={error} onRetry={fetchAgentStatus} />}

            {/* Summary Strip */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                <Card className="bg-zinc-900/80 border-zinc-800/60">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-emerald-400">{runningCount}</p>
                            <p className="text-[11px] text-zinc-500 uppercase tracking-wider">Running</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900/80 border-zinc-800/60">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-red-400">{errorCount}</p>
                            <p className="text-[11px] text-zinc-500 uppercase tracking-wider">Errors</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900/80 border-zinc-800/60">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <Server className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-blue-400">{totalAgents}</p>
                            <p className="text-[11px] text-zinc-500 uppercase tracking-wider">Total Agents</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Agent Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {agents.map((agent) => {
                    const sc = statusConfig[agent.status] || statusConfig.unknown;
                    const StatusIcon = sc.icon;

                    return (
                        <Card key={agent.id} className="bg-zinc-900/80 border-zinc-800/60 hover:border-zinc-700/80 transition-all duration-200">
                            <CardContent className="p-5">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center">
                                            <agent.icon className="w-5 h-5 text-zinc-300" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-zinc-100">{agent.name}</h3>
                                            <p className="text-[11px] text-zinc-500 mt-0.5">{agent.description}</p>
                                        </div>
                                    </div>
                                    <Badge className={`text-[10px] ${sc.bg} ${sc.color} border flex items-center gap-1`}>
                                        <StatusIcon className="w-3 h-3" />
                                        {sc.label}
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div className="px-3 py-2 rounded-lg bg-zinc-800/50">
                                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Uptime</p>
                                        <p className="text-sm font-semibold text-zinc-200 mt-0.5">{agent.uptime}</p>
                                    </div>
                                    <div className="px-3 py-2 rounded-lg bg-zinc-800/50">
                                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Ops</p>
                                        <p className="text-sm font-semibold text-zinc-200 mt-0.5">{agent.opsProcessed?.toLocaleString() || 0}</p>
                                    </div>
                                    <div className="px-3 py-2 rounded-lg bg-zinc-800/50">
                                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Heartbeat</p>
                                        <p className="text-sm font-semibold text-zinc-200 mt-0.5">
                                            {agent.lastHeartbeat ? timeAgo(agent.lastHeartbeat) : '--'}
                                        </p>
                                    </div>
                                </div>

                                {agent.errorCount && agent.errorCount > 0 ? (
                                    <div className="mt-3 flex items-center gap-2 text-[11px] text-red-400 bg-red-500/5 rounded-lg px-3 py-1.5 border border-red-500/10">
                                        <AlertTriangle className="w-3 h-3" />
                                        {agent.errorCount} error{agent.errorCount > 1 ? 's' : ''} in last hour
                                    </div>
                                ) : null}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
