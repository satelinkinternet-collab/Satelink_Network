'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Shield, Clock, Database, CheckCircle, AlertTriangle, Play, RefreshCw, FileText } from 'lucide-react';

export default function BackupsPage() {
    const [backups, setBackups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState<number | null>(null);
    const [verificationResult, setVerificationResult] = useState<any>(null);

    const fetchBackups = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/admin/system/backups', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
            });
            const data = await res.json();
            if (data.ok) setBackups(data.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBackups();
    }, [fetchBackups]);

    const runBackup = async () => {
        if (!confirm("Run immediate system backup? This may briefly pause writes.")) return;
        try {
            setLoading(true);
            const res = await fetch('/admin/system/backups/run', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
            });
            const data = await res.json();
            if (data.ok) {
                alert("Backup completed successfully!");
                fetchBackups();
            } else {
                alert("Backup failed: " + data.error);
            }
        } catch (e) {
            alert("Error: " + e);
        } finally {
            setLoading(false);
        }
    };

    const verifyBackup = async (id: number) => {
        setVerifying(id);
        setVerificationResult(null);
        try {
            const res = await fetch(`/admin/system/backups/verify/${id}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
            });
            const data = await res.json();
            if (data.ok) {
                setVerificationResult(data.data);
            } else {
                alert("Verification failed: " + data.error);
            }
        } catch (e) {
            alert("Error: " + e);
        } finally {
            setVerifying(null);
        }
    };

    return (
        <div className="p-6 space-y-6 max-w-6xl mx-auto text-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                        <Database className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Disaster Recovery</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Active
                            </span>
                            <span className="text-slate-400 text-sm">Automated Daily • Wal Checkpoint</span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={runBackup}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                >
                    <Play className="w-4 h-4" />
                    Run Manual Backup
                </button>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Backup List */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm">
                        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                            <h3 className="font-semibold text-slate-100 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-slate-400" /> Backup History
                            </h3>
                            <button onClick={fetchBackups} className="p-1 hover:bg-slate-800 rounded-lg transition-colors">
                                <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        <div className="divide-y divide-slate-800/50 max-h-[600px] overflow-y-auto">
                            {backups.length === 0 ? (
                                <div className="p-8 text-center text-slate-500">No backups found. Run one now!</div>
                            ) : (
                                backups.map((bk) => (
                                    <div key={bk.id} className="p-4 hover:bg-slate-800/30 transition-colors flex items-center justify-between group">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${bk.status === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                                <span className="font-mono text-sm text-slate-300">
                                                    {new Date(bk.created_at).toLocaleString()}
                                                </span>
                                                {bk.status !== 'success' && (
                                                    <span className="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded border border-red-500/20">FAILED</span>
                                                )}
                                            </div>
                                            <div className="text-xs text-slate-500 font-mono truncate max-w-sm">
                                                {bk.path.split('/').pop()} • {(bk.size_bytes / 1024 / 1024).toFixed(2)} MB • {bk.duration_ms}ms
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => verifyBackup(bk.id)}
                                                disabled={verifying === bk.id}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 rounded border border-slate-700"
                                            >
                                                {verifying === bk.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                                Verify
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Stats & Verification Detail */}
                <div className="space-y-6">
                    {/* Verification Result Card */}
                    {verificationResult && (
                        <div className="bg-slate-900/50 border border-emerald-500/30 rounded-xl p-4 animate-in fade-in slide-in-from-right-4">
                            <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-2 mb-3">
                                <Shield className="w-4 h-4" /> Integrity Verification
                            </h3>
                            <div className="space-y-3 text-xs font-mono">
                                <div className="flex justify-between items-center py-1 border-b border-slate-800">
                                    <span className="text-slate-500">Status</span>
                                    <span className={verificationResult.valid ? "text-emerald-400" : "text-red-400"}>
                                        {verificationResult.valid ? "PASS" : "FAIL"}
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-slate-500">Recorded Hash</div>
                                    <div className="truncate text-slate-300 bg-slate-950 p-1.5 rounded border border-slate-800">
                                        {verificationResult.recorded}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-slate-500">Computed Hash</div>
                                    <div className={`truncate p-1.5 rounded border border-slate-800 ${verificationResult.valid ? "bg-slate-950 text-slate-300" : "bg-red-900/20 text-red-300 border-red-500/30"}`}>
                                        {verificationResult.computed}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Policy Info */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
                        <h3 className="font-medium text-slate-200 mb-4 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-slate-400" /> Retention Policy
                        </h3>
                        <ul className="space-y-3 text-sm text-slate-400">
                            <li className="flex gap-2">
                                <span className="text-indigo-400">•</span>
                                <span>Daily snapshots retained for 30 days.</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-indigo-400">•</span>
                                <span>Latest WAL checkpoint enforced before backup.</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-indigo-400">•</span>
                                <span>SHA-256 integrity verification on-demand.</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-amber-400">•</span>
                                <span>Off-site replication: <span className="text-slate-500 italic">Not Configured</span></span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
