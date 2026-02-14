'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, ShieldCheck, Activity, Lock, Database } from 'lucide-react';

export default function PreflightPage() {
    const [status, setStatus] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const res = await fetch('/admin/preflight/status', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
            });
            const data = await res.json();
            if (data.ok) {
                setStatus(data.data);
            } else {
                setError(data.error);
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    if (loading && !status) return <div className="p-8 text-center text-slate-400">Running Preflight Checks...</div>;
    if (error) return <div className="p-8 text-center text-red-400">Error: {error}</div>;

    const isReady = status?.ready;

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-8 text-slate-200">

            {/* Hero Status */}
            <div className={`relative overflow-hidden rounded-2xl border ${isReady ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'} p-8 text-center`}>
                <div className="relative z-10 flex flex-col items-center gap-4">
                    {isReady ? (
                        <div className="p-4 bg-emerald-500/20 rounded-full border border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                            <ShieldCheck className="w-16 h-16 text-emerald-400" />
                        </div>
                    ) : (
                        <div className="p-4 bg-red-500/20 rounded-full border border-red-500/40 shadow-[0_0_30px_rgba(239,68,68,0.3)]">
                            <Lock className="w-16 h-16 text-red-400" />
                        </div>
                    )}

                    <div>
                        <h1 className={`text-4xl font-extrabold tracking-tight ${isReady ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isReady ? "SYSTEM READY FOR FLIGHT" : "PREFLIGHT FAILED"}
                        </h1>
                        <p className="mt-2 text-lg text-slate-400">
                            {isReady
                                ? "All critical systems go. Real money settlement authorized."
                                : "Critical blockers detected. Settlement disabled."}
                        </p>
                    </div>
                </div>
            </div>

            {/* Blockers & Warnings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Blockers */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2 text-red-400">
                        <XCircle className="w-5 h-5" /> Critical Blockers
                    </h3>
                    {status.blockers.length === 0 ? (
                        <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-800 text-slate-500 text-sm italic">
                            None detected.
                        </div>
                    ) : (
                        status.blockers.map((b: string, i: number) => (
                            <div key={i} className="p-4 rounded-lg bg-red-950/30 border border-red-500/20 text-red-200 text-sm font-medium flex items-start gap-3">
                                <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                                {b}
                            </div>
                        ))
                    )}
                </div>

                {/* Warnings */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2 text-amber-400">
                        <AlertTriangle className="w-5 h-5" /> Operational Warnings
                    </h3>
                    {status.warnings.length === 0 ? (
                        <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-800 text-slate-500 text-sm italic">
                            None detected.
                        </div>
                    ) : (
                        status.warnings.map((w: string, i: number) => (
                            <div key={i} className="p-4 rounded-lg bg-amber-950/30 border border-amber-500/20 text-amber-200 text-sm font-medium flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                                {w}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Detailed Checklist */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                    <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-indigo-400" /> System Checklist
                    </h3>
                    <span className="text-xs font-mono text-slate-500">
                        Last checked: {new Date(status.timestamp).toLocaleTimeString()}
                    </span>
                </div>
                <div className="divide-y divide-slate-800">
                    {status.checks.map((check: any, i: number) => (
                        <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-lg 
                      ${check.status === 'PASS' ? 'bg-emerald-500/10 text-emerald-400' :
                                        check.status === 'FAIL' ? 'bg-red-500/10 text-red-400' :
                                            'bg-amber-500/10 text-amber-400'}`}>
                                    {check.status === 'PASS' ? <CheckCircle className="w-5 h-5" /> :
                                        check.status === 'FAIL' ? <XCircle className="w-5 h-5" /> :
                                            <AlertTriangle className="w-5 h-5" />}
                                </div>
                                <div>
                                    <div className="font-medium text-slate-200">{check.name}</div>
                                    <div className="text-sm text-slate-500 font-mono">{check.details}</div>
                                </div>
                            </div>
                            <div>
                                <span className={`px-3 py-1 text-xs font-bold rounded border 
                      ${check.status === 'PASS' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                        check.status === 'FAIL' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                                            'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
                                    {check.status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}
