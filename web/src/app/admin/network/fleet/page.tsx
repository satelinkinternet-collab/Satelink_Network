
'use client';

import React, { useState, useEffect } from 'react';

export default function FleetPage() {
    const [summary, setSummary] = useState<any>(null);
    const [flaky, setFlaky] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('admin_token');
            const headers = { 'Authorization': `Bearer ${token}` };

            const [resSum, resFlaky] = await Promise.all([
                fetch('http://localhost:8080/admin/network/fleet/summary', { headers }),
                fetch('http://localhost:8080/admin/network/fleet/flaky', { headers })
            ]);

            const jsonSum = await resSum.json();
            const jsonFlaky = await resFlaky.json();

            if (jsonSum.ok) setSummary(jsonSum);
            else setError(jsonSum.error || 'Failed to fetch summary');

            if (jsonFlaky.ok) setFlaky(jsonFlaky.data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleQuarantine = async (nodeId: string) => {
        if (!confirm(`Quarantine node ${nodeId}?`)) return;
        try {
            const token = localStorage.getItem('admin_token');
            const res = await fetch('http://localhost:8080/admin/network/quarantine', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ node_id: nodeId, duration_m: 60 })
            });
            const json = await res.json();
            if (json.ok) alert(json.message);
            else alert(json.error);
        } catch (e: any) {
            alert(e.message);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white p-8 font-sans">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500 mb-8">
                    Node Fleet Readiness
                </h1>

                {error && (
                    <div className="bg-red-900/20 border border-red-500/30 text-red-400 p-4 rounded-lg mb-8">
                        {error}
                    </div>
                )}

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-[#111] border border-gray-800 p-6 rounded-xl">
                        <h3 className="text-gray-400 text-sm font-medium uppercase">Active (5m)</h3>
                        <p className="text-3xl font-bold text-white mt-2">{summary?.active_5m ?? '-'}</p>
                    </div>
                    <div className="bg-[#111] border border-gray-800 p-6 rounded-xl">
                        <h3 className="text-gray-400 text-sm font-medium uppercase">Active (1h)</h3>
                        <p className="text-3xl font-bold text-white mt-2">{summary?.active_1h ?? '-'}</p>
                    </div>
                    <div className="bg-[#111] border border-gray-800 p-6 rounded-xl">
                        <h3 className="text-gray-400 text-sm font-medium uppercase">Active (24h)</h3>
                        <p className="text-3xl font-bold text-white mt-2">{summary?.active_24h ?? '-'}</p>
                    </div>
                    <div className="bg-[#111] border border-gray-800 p-6 rounded-xl">
                        <h3 className="text-gray-400 text-sm font-medium uppercase">Health status</h3>
                        <p className="text-3xl font-bold text-green-400 mt-2">Healthy</p>
                    </div>
                </div>

                {/* Flaky Nodes */}
                <div className="bg-[#111] border border-gray-800 rounded-xl overflow-hidden">
                    <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-white">Top Flaky Nodes (High Variance / Low Heartbeats)</h2>
                        <button onClick={fetchData} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm">Refresh</button>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-gray-400">Loading fleet data...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-gray-800 bg-[#161616]">
                                        <th className="p-4 text-gray-400 font-medium">Node ID</th>
                                        <th className="p-4 text-gray-400 font-medium">Heartbeats (10m)</th>
                                        <th className="p-4 text-gray-400 font-medium">Last Seen</th>
                                        <th className="p-4 text-gray-400 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {flaky.map((node, i) => (
                                        <tr key={i} className="border-b border-gray-800 hover:bg-[#161616] transition-colors">
                                            <td className="p-4 font-mono text-sm text-gray-300">{node.node_id}</td>
                                            <td className="p-4 text-yellow-400 font-bold">{node.hb_count}</td>
                                            <td className="p-4 text-gray-500 text-sm">{new Date(node.last_seen).toLocaleTimeString()}</td>
                                            <td className="p-4">
                                                <button
                                                    onClick={() => handleQuarantine(node.node_id)}
                                                    className="bg-red-900/40 text-red-300 px-3 py-1 rounded text-xs border border-red-800 hover:bg-red-900/60"
                                                >
                                                    Quarantine
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {flaky.length === 0 && (
                                        <tr><td colSpan={4} className="p-8 text-center text-gray-500">No flaky nodes detected.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
