
'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function EvmSettlementPage() {
    const searchParams = useSearchParams();
    const batchId = searchParams.get('batch_id');
    const [txs, setTxs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [reconciling, setReconciling] = useState(false);

    const fetchTxs = async () => {
        if (!batchId) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('admin_token');
            const res = await fetch(`http://localhost:8080/admin/settlement/evm/batch/${batchId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            if (json.ok) setTxs(json.data);
            else setError(json.error);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTxs();
    }, [batchId]);

    const handleReconcile = async () => {
        if (!batchId) return;
        setReconciling(true);
        try {
            const token = localStorage.getItem('admin_token');
            const res = await fetch(`http://localhost:8080/admin/settlement/evm/reconcile/${batchId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            if (json.ok) {
                alert(`Reconciled: ${json.data.previous} -> ${json.data.current}`);
                fetchTxs();
            } else {
                alert(`Error: ${json.error}`);
            }
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        } finally {
            setReconciling(false);
        }
    };

    const handleRetry = async (itemId: string) => {
        if (!confirm("Are you sure you want to retry this item?")) return;
        try {
            const token = localStorage.getItem('admin_token');
            const res = await fetch(`http://localhost:8080/admin/settlement/evm/retry-item`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ batch_id: batchId, item_id: itemId })
            });
            const json = await res.json();
            if (json.ok) {
                alert("Retry requested");
                fetchTxs();
            } else {
                alert(`Error: ${json.error}`);
            }
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        }
    };

    if (!batchId) return <div className="p-8 text-white">No batch_id provided</div>;

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white p-8 font-sans">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                            EVM Settlement Details
                        </h1>
                        <p className="text-gray-400 mt-2">Batch: {batchId}</p>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={handleReconcile} disabled={reconciling}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            {reconciling ? 'Reconciling...' : 'Reconcile Batch'}
                        </button>
                        <button
                            onClick={fetchTxs}
                            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition-colors"
                        >
                            Refresh
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-900/20 border border-red-500/30 text-red-400 p-4 rounded-lg mb-8">
                        {error}
                    </div>
                )}

                <div className="bg-[#111] border border-gray-800 rounded-xl overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center text-gray-400">Loading...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-gray-800 bg-[#161616]">
                                        <th className="p-4 text-gray-400 font-medium">Item ID</th>
                                        <th className="p-4 text-gray-400 font-medium">To Address</th>
                                        <th className="p-4 text-gray-400 font-medium">Amount</th>
                                        <th className="p-4 text-gray-400 font-medium">Status</th>
                                        <th className="p-4 text-gray-400 font-medium">TX Hash</th>
                                        <th className="p-4 text-gray-400 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {txs.map((tx) => (
                                        <tr key={tx.id} className="border-b border-gray-800 hover:bg-[#161616] transition-colors">
                                            <td className="p-4 text-sm font-mono text-gray-500">{tx.item_id.substring(0, 8)}...</td>
                                            <td className="p-4 font-mono text-sm">{tx.to_address}</td>
                                            <td className="p-4 text-blue-400 font-medium">{tx.amount_atomic} (atomic)</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${tx.status === 'confirmed' ? 'bg-green-900/30 text-green-400' :
                                                        tx.status === 'sent' ? 'bg-yellow-900/30 text-yellow-400' :
                                                            tx.status === 'failed' ? 'bg-red-900/30 text-red-400' :
                                                                'bg-gray-800 text-gray-400'
                                                    }`}>
                                                    {tx.status}
                                                </span>
                                                {tx.error_message && <div className="text-xs text-red-500 mt-1 max-w-xs">{tx.error_message}</div>}
                                            </td>
                                            <td className="p-4 font-mono text-xs text-gray-500">
                                                {tx.tx_hash ? (
                                                    <a href={`#`} className="hover:text-blue-400 decoration-none">{tx.tx_hash.substring(0, 10)}...</a>
                                                ) : '-'}
                                            </td>
                                            <td className="p-4">
                                                {tx.status === 'failed' && (
                                                    <button
                                                        onClick={() => handleRetry(tx.item_id)}
                                                        className="text-xs bg-red-900/50 hover:bg-red-800 text-red-200 px-2 py-1 rounded border border-red-700"
                                                    >
                                                        Retry
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {txs.length === 0 && (
                                        <tr><td colSpan={6} className="p-8 text-center text-gray-500">No transactions found for this batch.</td></tr>
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
