
"use client";
import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../../../components/AdminLayout'; // Adjust path
import { useAuth } from '../../../../context/AuthContext'; // Adjust path
import { Activity, Shield, Shuffle, GitMerge, CheckCircle, AlertTriangle } from 'lucide-react';

export default function SettlementOverviewPage() {
    const { token } = useAuth();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchOverview = async () => {
        try {
            const res = await fetch('/admin/settlement/overview', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            if (json.ok) setData(json);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchOverview();
        const interval = setInterval(fetchOverview, 5000);
        return () => clearInterval(interval);
    }, [token]);

    const toggleConfig = async (key: string, value: any) => {
        if (!confirm(`Change ${key} to ${value}?`)) return;
        await fetch('/admin/settlement/config', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ [key]: value })
        });
        fetchOverview();
    };

    if (loading) return <AdminLayout>Loading...</AdminLayout>;
    if (!data) return <AdminLayout>Error loading settlement data</AdminLayout>;

    const { stats, config, health } = data;

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Activity className="w-6 h-6 text-purple-400" />
                        Settlement Engine V1
                    </h1>
                    <div className="flex gap-2">
                        <span className={`px-3 py-1 rounded text-sm font-mono ${health.ok ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
                            Adapter Health: {health.ok ? 'OK' : 'FAIL'} ({health.latency_ms}ms)
                        </span>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gray-800 p-4 rounded border border-gray-700">
                        <div className="text-gray-400 text-sm">Queued Batches</div>
                        <div className="text-3xl font-bold text-white mt-1">{stats.queued}</div>
                    </div>
                    <div className="bg-gray-800 p-4 rounded border border-gray-700">
                        <div className="text-gray-400 text-sm">Processing</div>
                        <div className="text-3xl font-bold text-blue-400 mt-1">{stats.processing}</div>
                    </div>
                    <div className="bg-gray-800 p-4 rounded border border-gray-700">
                        <div className="text-gray-400 text-sm">Failed</div>
                        <div className="text-3xl font-bold text-red-400 mt-1">{stats.failed}</div>
                    </div>
                    <div className="bg-gray-800 p-4 rounded border border-gray-700">
                        <div className="text-gray-400 text-sm">Current Adapter</div>
                        <div className="text-xl font-bold text-purple-400 mt-2 truncate">{config.adapter}</div>
                    </div>
                </div>

                {/* Controls */}
                <div className="bg-gray-900 p-6 rounded border border-gray-700">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Shield className="w-5 h-5" />
                        Engine Configuration
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="flex items-center justify-between p-4 bg-gray-800 rounded">
                            <div>
                                <div className="font-bold">Dry Run Mode</div>
                                <div className="text-xs text-gray-400">Simulate success, no external calls</div>
                            </div>
                            <button
                                onClick={() => toggleConfig('dry_run', !config.dry_run)}
                                className={`px-4 py-2 rounded font-bold ${config.dry_run ? 'bg-yellow-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                            >
                                {config.dry_run ? 'ENABLED' : 'DISABLED'}
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-800 rounded">
                            <div>
                                <div className="font-bold">Shadow Mode</div>
                                <div className="text-xs text-gray-400">Run parallel shadow adapter & compare</div>
                            </div>
                            <button
                                onClick={() => toggleConfig('shadow_mode', !config.shadow_mode)}
                                className={`px-4 py-2 rounded font-bold ${config.shadow_mode ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                            >
                                {config.shadow_mode ? 'ACTIVE' : 'OFF'}
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-800 rounded opacity-50 cursor-not-allowed">
                            <div>
                                <div className="font-bold">Adapter</div>
                                <div className="text-xs text-gray-400">Currently fixed to SIMULATED</div>
                            </div>
                            <Shuffle className="w-5 h-5" />
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-gray-900 p-6 rounded border border-gray-700">
                    <h2 className="text-lg font-bold mb-4">Manual Operations</h2>
                    <button
                        onClick={async () => {
                            await fetch('/admin/settlement/process-queue', {
                                method: 'POST',
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            alert('Queue Processing Triggered');
                            fetchOverview();
                        }}
                        className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded text-white font-bold"
                    >
                        Trigger Process Queue Now
                    </button>
                </div>
            </div>
        </AdminLayout>
    );
}
