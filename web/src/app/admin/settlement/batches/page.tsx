
"use client";
import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../../../components/AdminLayout';
import { useAuth } from '../../../../context/AuthContext';
import { RefreshCw, ExternalLink } from 'lucide-react';

export default function SettlementBatchesPage() {
    const { token } = useAuth();
    const [batches, setBatches] = useState<any[]>([]);

    const fetchBatches = async () => {
        const res = await fetch('/admin/settlement/batches?limit=50', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.ok) setBatches(json.data);
    };

    useEffect(() => {
        if (token) fetchBatches();
    }, [token]);

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold">Settlement Batches</h1>
                    <button onClick={fetchBatches} className="p-2 bg-gray-700 rounded hover:bg-gray-600">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>

                <div className="bg-gray-900 rounded border border-gray-700 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-800 text-gray-400 text-sm border-b border-gray-700">
                                <th className="p-3">ID</th>
                                <th className="p-3">Adapter</th>
                                <th className="p-3">Status</th>
                                <th className="p-3">Amount</th>
                                <th className="p-3">Fee</th>
                                <th className="p-3">Ext Ref</th>
                                <th className="p-3">Created</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {batches.map(batch => (
                                <tr key={batch.id} className="hover:bg-gray-800">
                                    <td className="p-3 font-mono text-xs text-gray-500 truncate max-w-[100px]" title={batch.id}>{batch.id}</td>
                                    <td className="p-3 text-sm">{batch.adapter_type}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase
                                            ${batch.status === 'completed' ? 'bg-green-900 text-green-300' :
                                                batch.status === 'failed' ? 'bg-red-900 text-red-300' :
                                                    batch.status === 'processing' ? 'bg-blue-900 text-blue-300' : 'bg-gray-700 text-gray-300'}`}>
                                            {batch.status}
                                        </span>
                                    </td>
                                    <td className="p-3 font-mono">{batch.total_amount} {batch.currency}</td>
                                    <td className="p-3 font-mono text-gray-500">{batch.fee_amount}</td>
                                    <td className="p-3 text-xs font-mono">{batch.external_ref || '-'}</td>
                                    <td className="p-3 text-xs text-gray-500">{new Date(batch.created_at).toLocaleString()}</td>
                                </tr>
                            ))}
                            {batches.length === 0 && (
                                <tr><td colSpan={7} className="p-8 text-center text-gray-500">No batches found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    );
}
