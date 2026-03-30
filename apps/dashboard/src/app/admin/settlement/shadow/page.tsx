"use client";
import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../../../components/AdminLayout';
import { GitMerge, RefreshCw } from 'lucide-react';
import api from '@/lib/api';

export default function SettlementShadowPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [error, setError] = useState('');

    const fetchLogs = async () => {
        try {
            setError('');
            const res = await api.get('/admin/services/settlement/shadow-logs');
            if (res.data.ok) setLogs(res.data.data);
        } catch (e: any) {
            console.error('[SettlementShadow]', e);
            setError(e.response?.data?.error || 'Failed to load shadow logs');
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <GitMerge className="w-6 h-6 text-yellow-400" />
                        Shadow Mode Diffs
                    </h1>
                    <button onClick={fetchLogs} className="p-2 bg-gray-700 rounded hover:bg-gray-600">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>

                {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">{error}</div>}

                <div className="bg-gray-900 rounded border border-gray-700 p-6">
                    <div className="text-sm text-gray-400 mb-4">
                        History of discrepancies between the Primary Adapter and the Shadow Adapter.
                    </div>

                    <div className="space-y-4">
                        {logs.map(log => (
                            <div key={log.id} className="bg-gray-800 p-4 rounded border border-gray-700">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="font-mono text-yellow-500">Batch: {log.batch_id}</span>
                                    <span className="text-gray-500">{new Date(log.created_at).toLocaleString()}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                                    <div className="bg-black/50 p-2 rounded">
                                        <div className="text-gray-400 mb-1 border-b border-gray-700">Primary</div>
                                        <pre className="whitespace-pre-wrap">{log.primary_json}</pre>
                                    </div>
                                    <div className="bg-black/50 p-2 rounded">
                                        <div className="text-gray-400 mb-1 border-b border-gray-700">Shadow</div>
                                        <pre className="whitespace-pre-wrap">{log.shadow_json}</pre>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {logs.length === 0 && (
                            <div className="text-center text-gray-500 py-8">
                                No shadow mismatches recorded. System is consistent.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
