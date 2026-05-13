"use client";


export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;


import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Globe, Webhook, Cpu, CheckCircle, XCircle, Loader2, Clock } from 'lucide-react';

type TestResult = {
    name: string;
    status: 'idle' | 'running' | 'success' | 'error';
    response?: any;
    duration?: number;
    error?: string;
};

export default function WorkloadTestPage() {
    const { user } = useAuth();
    const [results, setResults] = useState<TestResult[]>([]);

    const updateResult = (name: string, update: Partial<TestResult>) => {
        setResults(prev => {
            const idx = prev.findIndex(r => r.name === name);
            if (idx >= 0) {
                const copy = [...prev];
                copy[idx] = { ...copy[idx], ...update };
                return copy;
            }
            return [...prev, { name, status: 'idle', ...update } as TestResult];
        });
    };

    const runTest = async (name: string, fn: () => Promise<any>) => {
        updateResult(name, { status: 'running', response: undefined, error: undefined, duration: undefined });
        const start = performance.now();
        try {
            const response = await fn();
            const duration = Math.round(performance.now() - start);
            updateResult(name, { status: 'success', response: response.data, duration });
        } catch (e: any) {
            const duration = Math.round(performance.now() - start);
            updateResult(name, { status: 'error', error: e.response?.data?.error || e.message, duration });
        }
    };

    const sendRpcCall = () => runTest('RPC Call', () =>
        api.post('/v1/ops/execute', {
            op_type: 'rpc_call',
            node_id: user?.wallet || 'test_node',
            client_id: 'dashboard_test',
            request_id: `rpc_${Date.now()}`,
            timestamp: Math.floor(Date.now() / 1000),
            payload_hash: 'test_rpc',
        })
    );

    const sendAutomationJob = () => runTest('Automation Job', () =>
        api.post('/v1/ops/execute', {
            op_type: 'automation_job_execute',
            node_id: user?.wallet || 'test_node',
            client_id: 'dashboard_test',
            request_id: `auto_${Date.now()}`,
            timestamp: Math.floor(Date.now() / 1000),
            payload_hash: 'test_automation',
        })
    );

    const sendWebhook = () => runTest('Webhook Delivery', () =>
        api.post('/v1/ops/execute', {
            op_type: 'api_relay_execution',
            node_id: user?.wallet || 'test_node',
            client_id: 'dashboard_test',
            request_id: `webhook_${Date.now()}`,
            timestamp: Math.floor(Date.now() / 1000),
            payload_hash: 'test_webhook',
        })
    );

    const sendAiInference = () => runTest('AI Inference', () =>
        api.post('/v1/ops/execute', {
            op_type: 'ai_inference',
            node_id: user?.wallet || 'test_node',
            client_id: 'dashboard_test',
            request_id: `ai_${Date.now()}`,
            timestamp: Math.floor(Date.now() / 1000),
            payload_hash: 'test_ai',
        })
    );

    const runAllTests = async () => {
        await sendRpcCall();
        await sendAutomationJob();
        await sendWebhook();
        await sendAiInference();
    };

    const StatusIcon = ({ status }: { status: string }) => {
        switch (status) {
            case 'running': return <Loader2 className="w-4 h-4 animate-spin text-blue-400" />;
            case 'success': return <CheckCircle className="w-4 h-4 text-emerald-400" />;
            case 'error': return <XCircle className="w-4 h-4 text-red-400" />;
            default: return <Clock className="w-4 h-4 text-zinc-500" />;
        }
    };

    const workloads = [
        { name: 'RPC Call', icon: Globe, desc: 'Send an RPC relay operation', action: sendRpcCall, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        { name: 'Automation Job', icon: Cpu, desc: 'Execute an automation workflow', action: sendAutomationJob, color: 'text-violet-400', bg: 'bg-violet-500/10' },
        { name: 'Webhook Delivery', icon: Webhook, desc: 'Relay a webhook payload', action: sendWebhook, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        { name: 'AI Inference', icon: Zap, desc: 'Run an AI inference task', action: sendAiInference, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    ];

    return (
        <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-50">Workload Test Console</h1>
                    <p className="text-sm text-zinc-500 mt-1">Send real workloads and verify the pipeline end-to-end</p>
                </div>
                <button
                    onClick={runAllTests}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                    Run All Tests
                </button>
            </div>

            {/* Workload Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {workloads.map((w) => (
                    <Card key={w.name} className="bg-zinc-900/80 border-zinc-800/60 hover:border-zinc-700/80 transition-all">
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg ${w.bg} flex items-center justify-center`}>
                                        <w.icon className={`w-5 h-5 ${w.color}`} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-zinc-200">{w.name}</h3>
                                        <p className="text-xs text-zinc-500">{w.desc}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={w.action}
                                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-md border border-zinc-700/50 transition-colors"
                                >
                                    Send
                                </button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Results */}
            {results.length > 0 && (
                <Card className="bg-zinc-900/80 border-zinc-800/60">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-zinc-300">Test Results</CardTitle>
                        <CardDescription className="text-xs text-zinc-600">
                            {results.filter(r => r.status === 'success').length} passed,{' '}
                            {results.filter(r => r.status === 'error').length} failed
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {results.map((r, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 bg-zinc-800/40 rounded-lg border border-zinc-800/60">
                                <StatusIcon status={r.status} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-zinc-200">{r.name}</span>
                                        {r.duration !== undefined && (
                                            <Badge variant="outline" className="text-[10px] text-zinc-500 border-zinc-700">
                                                {r.duration}ms
                                            </Badge>
                                        )}
                                    </div>
                                    {r.status === 'success' && r.response && (
                                        <pre className="mt-2 text-[11px] text-zinc-400 bg-zinc-900 rounded p-2 overflow-x-auto max-h-32 scrollbar-thin">
                                            {JSON.stringify(r.response, null, 2)}
                                        </pre>
                                    )}
                                    {r.status === 'error' && r.error && (
                                        <p className="mt-1 text-xs text-red-400">{r.error}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
