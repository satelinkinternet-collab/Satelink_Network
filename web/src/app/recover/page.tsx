'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { importKeystore, signMessage } from '@/lib/embeddedWallet';
import axios from 'axios';
import { toast } from 'sonner';

/**
 * Phase H3 — Multi-Device Support (/recover)
 * Allows importing a keystore JSON to restore access.
 */
export default function RecoverPage() {
    const router = useRouter();
    const [json, setJson] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRestore = async () => {
        if (!json || !password) {
            toast.error('Keystore JSON and Password required');
            return;
        }

        setLoading(true);
        try {
            // 1. Import locally (Re-encrypts with device key)
            toast.loading('Decrypting and securing wallet...');
            const address = await importKeystore(json, password);
            toast.dismiss();

            // 2. Immediate Login (Start/Finish)
            toast.loading('Authenticating...');
            const startRes = await axios.post('/auth/embedded/start', { address });
            if (!startRes.data.ok) throw new Error(startRes.data.error);

            const { nonce, message_template, created_at } = startRes.data;
            const message = message_template
                .replace('${nonce}', nonce)
                .replace('${address}', address)
                .replace('${timestamp}', created_at || Date.now());

            const signature = await signMessage(message);
            const finishRes = await axios.post('/auth/embedded/finish', { address, signature });

            if (finishRes.data.ok) {
                toast.dismiss();
                toast.success('Wallet restored and logged in!');
                router.push('/admin/command-center');
            } else {
                throw new Error(finishRes.data.error);
            }
        } catch (e: any) {
            toast.dismiss();
            toast.error('Restoration failed: ' + (e.message || 'Check password'));
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            setJson(event.target?.result as string);
        };
        reader.readAsText(file);
    };

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full p-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold tracking-tight mb-2 text-blue-400">Restore Account</h1>
                    <p className="text-white/50 text-sm">Upload your backup file to regain access on this device.</p>
                </div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-white/30 uppercase tracking-widest">Backup File</label>
                        <input
                            type="file"
                            accept=".json"
                            onChange={handleFileUpload}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs focus:border-white/30 outline-none file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600 cursor-pointer"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-white/30 uppercase tracking-widest">Password</label>
                        <input
                            type="password"
                            placeholder="Enter backup password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:border-white/30 outline-none"
                        />
                    </div>

                    <button
                        onClick={handleRestore}
                        disabled={loading || !json || !password}
                        className="w-full py-4 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Restoring...' : 'Restore & Continue'}
                    </button>

                    <button
                        onClick={() => router.push('/login')}
                        className="w-full py-2 text-white/40 text-xs hover:text-white transition-colors"
                    >
                        Back to Login
                    </button>
                </div>

                <div className="mt-10 pt-8 border-t border-white/5 text-center">
                    <p className="text-[10px] uppercase tracking-widest text-white/20 font-medium">
                        Device keys will be regenerated locally.
                    </p>
                </div>
            </div>
        </div>
    );
}
