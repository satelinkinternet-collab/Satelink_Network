"use client";

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Wrench, Copy, Download, Bug, X, ChevronUp, Clipboard, Check,
    FileJson, Radio, ExternalLink
} from 'lucide-react';
import api from '@/lib/api';
import { useIsReadonly, JsonViewer } from '@/components/admin/admin-shared';

interface DebugToolboxProps {
    /** Current page context (e.g., filters, search params) */
    viewContext?: Record<string, any>;
    /** Last SSE event payload (stored in parent state) */
    lastSsePayload?: any;
    /** Whether SSE is connected */
    sseConnected?: boolean;
}

export function DebugToolbox({ viewContext, lastSsePayload, sseConnected }: DebugToolboxProps) {
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState('');
    const [fixModal, setFixModal] = useState(false);
    const [fixNotes, setFixNotes] = useState('');
    const [fixScope, setFixScope] = useState<string[]>(['backend', 'web', 'db']);
    const [fixRisk, setFixRisk] = useState('low');
    const [fixLoading, setFixLoading] = useState(false);
    const [fixResult, setFixResult] = useState<any>(null);
    const [exportLoading, setExportLoading] = useState(false);
    const readonly = useIsReadonly();
    const panelRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const copyToClipboard = async (text: string, label: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(label);
            setTimeout(() => setCopied(''), 2000);
        } catch { }
    };

    const copyViewContext = () => {
        const ctx = {
            url: window.location.href,
            timestamp: new Date().toISOString(),
            sse_connected: sseConnected,
            ...viewContext
        };
        copyToClipboard(JSON.stringify(ctx, null, 2), 'context');
    };

    const copySsePayload = () => {
        if (!lastSsePayload) return;
        copyToClipboard(JSON.stringify(lastSsePayload, null, 2), 'sse');
    };

    const exportLatestBundle = async () => {
        setExportLoading(true);
        try {
            const listRes = await api.get('/admin/diagnostics/incidents?status=open&limit=1');
            const incidents = listRes.data.incidents;
            if (!incidents?.length) {
                copyToClipboard(JSON.stringify({ note: 'No open incidents' }, null, 2), 'export');
                return;
            }
            const exportRes = await api.get(`/admin/diagnostics/incidents/${incidents[0].id}/export`);
            copyToClipboard(JSON.stringify(exportRes.data.bundle_json, null, 2), 'export');
        } catch (e: any) {
            copyToClipboard(JSON.stringify({ error: e.message }, null, 2), 'export');
        } finally {
            setExportLoading(false);
        }
    };

    const submitFixRequest = async () => {
        setFixLoading(true);
        setFixResult(null);
        try {
            const listRes = await api.get('/admin/diagnostics/incidents?status=open&limit=1');
            const incidents = listRes.data.incidents;
            if (!incidents?.length) {
                setFixResult({ error: 'No open incidents to create fix request for' });
                return;
            }
            const res = await api.post('/admin/diagnostics/fix-request', {
                incident_id: incidents[0].id,
                agent: 'antigravity',
                request_notes: fixNotes,
                preferred_scope: fixScope,
                max_risk: fixRisk
            });
            setFixResult(res.data);
        } catch (e: any) {
            setFixResult({ error: e.response?.data?.error || e.message });
        } finally {
            setFixLoading(false);
        }
    };

    const CopyIcon = ({ label }: { label: string }) =>
        copied === label
            ? <Check className="h-3.5 w-3.5 text-emerald-400" />
            : <Copy className="h-3.5 w-3.5" />;

    return (
        <>
            {/* FAB */}
            <button
                onClick={() => setOpen(!open)}
                className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 
                         shadow-lg shadow-purple-500/25 flex items-center justify-center text-white
                         hover:shadow-purple-500/40 hover:scale-105 transition-all duration-200
                         active:scale-95 sm:w-11 sm:h-11"
                aria-label="Debug Toolbox"
            >
                {open ? <X className="h-5 w-5" /> : <Wrench className="h-5 w-5" />}
            </button>

            {/* Panel — bottom sheet on mobile, dropdown on desktop */}
            {open && (
                <div
                    ref={panelRef}
                    className="fixed z-50 
                             bottom-0 left-0 right-0 sm:bottom-20 sm:right-6 sm:left-auto
                             sm:w-[380px] max-h-[80vh] overflow-y-auto
                             bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-xl
                             shadow-2xl shadow-black/60 animate-in slide-in-from-bottom duration-200"
                >
                    {/* Handle bar (mobile) */}
                    <div className="sm:hidden flex justify-center pt-2 pb-1">
                        <div className="w-10 h-1 rounded-full bg-zinc-700" />
                    </div>

                    <div className="px-4 py-3 border-b border-zinc-800/60 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Wrench className="h-4 w-4 text-purple-400" />
                            <span className="text-sm font-semibold text-zinc-200">Debug Toolbox</span>
                        </div>
                        <Badge className="bg-zinc-800 text-zinc-500 text-[10px] border-zinc-700">
                            {sseConnected ? '● SSE Live' : '○ Polling'}
                        </Badge>
                    </div>

                    <div className="p-3 space-y-2">
                        {/* 1. Copy view context */}
                        <button
                            onClick={copyViewContext}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-zinc-800/50 
                                     hover:bg-zinc-800 transition-colors text-left group"
                        >
                            <Clipboard className="h-4 w-4 text-zinc-500 group-hover:text-blue-400 transition-colors shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-zinc-300">Copy View Context</p>
                                <p className="text-[11px] text-zinc-600">URL, filters, timestamps</p>
                            </div>
                            <CopyIcon label="context" />
                        </button>

                        {/* 2. Copy last SSE */}
                        <button
                            onClick={copySsePayload}
                            disabled={!lastSsePayload}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-zinc-800/50 
                                     hover:bg-zinc-800 transition-colors text-left group disabled:opacity-40"
                        >
                            <Radio className="h-4 w-4 text-zinc-500 group-hover:text-emerald-400 transition-colors shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-zinc-300">Copy Last SSE Payload</p>
                                <p className="text-[11px] text-zinc-600">Latest real-time event</p>
                            </div>
                            <CopyIcon label="sse" />
                        </button>

                        {/* 3. Export bundle */}
                        <button
                            onClick={exportLatestBundle}
                            disabled={exportLoading}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-zinc-800/50 
                                     hover:bg-zinc-800 transition-colors text-left group disabled:opacity-60"
                        >
                            <Download className="h-4 w-4 text-zinc-500 group-hover:text-amber-400 transition-colors shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-zinc-300">{exportLoading ? 'Exporting…' : 'Export Incident Bundle'}</p>
                                <p className="text-[11px] text-zinc-600">Latest open → clipboard</p>
                            </div>
                            <CopyIcon label="export" />
                        </button>

                        {/* 4. Fix request */}
                        {!readonly && (
                            <button
                                onClick={() => setFixModal(true)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg 
                                         bg-purple-500/10 border border-purple-500/20
                                         hover:bg-purple-500/20 transition-colors text-left group"
                            >
                                <Bug className="h-4 w-4 text-purple-400 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-purple-300 font-medium">Create Fix Request</p>
                                    <p className="text-[11px] text-purple-400/60">Generate task spec for Antigravity</p>
                                </div>
                                <ExternalLink className="h-3.5 w-3.5 text-purple-500/50" />
                            </button>
                        )}

                        {/* Quick links */}
                        <div className="pt-1 border-t border-zinc-800/40">
                            <p className="text-[10px] text-zinc-600 uppercase tracking-wider px-1 mb-1.5">Quick Links</p>
                            <div className="flex flex-wrap gap-1.5">
                                {[
                                    { label: 'Errors', href: '/admin/ops/errors' },
                                    { label: 'Traces', href: '/admin/ops/traces' },
                                    { label: 'Slow Queries', href: '/admin/ops/slow-queries' },
                                    { label: 'Incidents', href: '/admin/diagnostics/incidents' },
                                    { label: 'Self-Tests', href: '/admin/diagnostics/self-tests' },
                                ].map(link => (
                                    <a key={link.href} href={link.href}
                                        className="text-[11px] px-2 py-1 rounded bg-zinc-800/60 text-zinc-400 
                                                 hover:bg-zinc-700 hover:text-zinc-200 transition-colors">
                                        {link.label}
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Fix Request Modal */}
            {fixModal && (
                <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="px-5 py-4 border-b border-zinc-800/60 flex items-center justify-between">
                            <h3 className="text-base font-semibold text-zinc-200">Create Fix Request</h3>
                            <button onClick={() => { setFixModal(false); setFixResult(null); }} className="text-zinc-500 hover:text-zinc-300">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            {!fixResult ? (
                                <>
                                    <div>
                                        <label className="text-xs text-zinc-500 uppercase mb-1 block">Notes for Agent</label>
                                        <textarea
                                            value={fixNotes}
                                            onChange={e => setFixNotes(e.target.value)}
                                            placeholder="Focus on SSE disconnects + trace insert failures..."
                                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 
                                                     placeholder:text-zinc-600 min-h-[80px] focus:outline-none focus:border-purple-500/50"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs text-zinc-500 uppercase mb-1 block">Scope</label>
                                        <div className="flex gap-2 flex-wrap">
                                            {['backend', 'web', 'db', 'infra'].map(s => (
                                                <Badge key={s}
                                                    onClick={() => setFixScope(prev =>
                                                        prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
                                                    )}
                                                    className={`cursor-pointer text-xs ${fixScope.includes(s) ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
                                                    {s}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs text-zinc-500 uppercase mb-1 block">Max Risk</label>
                                        <div className="flex gap-2">
                                            {['low', 'medium', 'high'].map(r => (
                                                <Badge key={r}
                                                    onClick={() => setFixRisk(r)}
                                                    className={`cursor-pointer text-xs capitalize ${fixRisk === r
                                                        ? r === 'high' ? 'bg-red-600 text-white' : r === 'medium' ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white'
                                                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
                                                    {r}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>

                                    <Button onClick={submitFixRequest} disabled={fixLoading}
                                        className="w-full bg-purple-600 hover:bg-purple-500 text-white">
                                        <Bug className="h-4 w-4 mr-2" />
                                        {fixLoading ? 'Generating…' : 'Generate Fix Request'}
                                    </Button>
                                </>
                            ) : (
                                <div className="space-y-3">
                                    {fixResult.error ? (
                                        <div className="p-3 rounded-lg bg-red-900/20 border border-red-500/20 text-red-400 text-sm">
                                            {fixResult.error}
                                        </div>
                                    ) : (
                                        <>
                                            <div className="p-3 rounded-lg bg-emerald-900/20 border border-emerald-500/20">
                                                <p className="text-emerald-400 text-sm font-medium">✓ Fix request created</p>
                                                <p className="text-emerald-400/60 text-xs mt-1">Incident #{fixResult.incident_id} → sent_to_agent</p>
                                            </div>
                                            {fixResult.task_spec && (
                                                <div>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <p className="text-[10px] text-zinc-500 uppercase">Task Spec</p>
                                                        <button onClick={() => copyToClipboard(JSON.stringify(fixResult.task_spec, null, 2), 'task_spec')}
                                                            className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1">
                                                            <CopyIcon label="task_spec" /> Copy
                                                        </button>
                                                    </div>
                                                    <JsonViewer data={fixResult.task_spec} label="" />
                                                </div>
                                            )}
                                        </>
                                    )}
                                    <Button onClick={() => { setFixModal(false); setFixResult(null); }} variant="outline"
                                        className="w-full text-zinc-400 border-zinc-700">
                                        Close
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
