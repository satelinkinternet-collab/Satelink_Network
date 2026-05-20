'use client';

import React, { useState, useEffect } from 'react';
import {
    getActiveAddress,
    exportKeystore,
    importKeystore
} from '@/lib/embeddedWallet';
import { useReAuth } from '@/hooks/use-reauth';
import { toast } from 'sonner';

export default function SecurityPage() {
    const [address, setAddress] = useState<string | null>(null);
    const [password, setPassword] = useState('');
    const [importJson, setImportJson] = useState('');
    const [showExport, setShowExport] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const { requestReAuth, ReAuthComponent } = useReAuth();

    useEffect(() => {
        getActiveAddress().then(setAddress);
    }, []);

    const handleExport = async () => {
        if (!password) {
            toast.error('Password required to encrypt backup');
            return;
        }
        try {
            await requestReAuth('export_wallet');

            toast.loading('Encrypting wallet...');
            const keystore = await exportKeystore(password);

            const blob = new Blob([keystore], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `satelink-wallet-${address}.json`;
            a.click();

            toast.dismiss();
            toast.success('Backup downloaded');
            setShowExport(false);
            setPassword('');
        } catch (e: any) {
            toast.dismiss();
            toast.error('Export failed: ' + e.message);
        }
    };

    const handleImport = async () => {
        if (!password || !importJson) {
            toast.error('Password and Keystore JSON required');
            return;
        }
        try {
            toast.loading('Importing wallet...');
            const newAddress = await importKeystore(importJson, password);
            setAddress(newAddress);
            toast.dismiss();
            toast.success('Wallet restored: ' + newAddress);
            setShowImport(false);
            setPassword('');
            setImportJson('');
        } catch (e: any) {
            toast.dismiss();
            toast.error('Import failed: Check password');
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <header className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold">Account Security</h1>
                <p className="text-white/50">Manage your device wallet and backups.</p>
                {ReAuthComponent}
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Active Wallet Card */}
                <div className="p-6 rounded-2xl border border-white/10 bg-white/5">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        Active Device Wallet
                    </h2>
                    <div className="bg-black/40 p-3 rounded-lg font-mono text-sm break-all mb-4">
                        {address || 'No wallet generated yet'}
                    </div>
                    <div className="flex items-center gap-2 mb-4">
                        <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase">
                            Basic Security
                        </span>
                        <span className="text-xs text-white/40 italic">
                            Device-bound only
                        </span>
                    </div>
                    <p className="text-xs text-white/60 leading-relaxed">
                        This wallet is stored securely on this device. If you clear your browser data or use a different device, you will lose access unless you have a backup.
                    </p>
                </div>

                {/* Backup & Recovery Card */}
                <div className="p-6 rounded-2xl border border-white/10 bg-white/5 space-y-4">
                    <h2 className="text-lg font-semibold">Keep it safe</h2>

                    {!showExport && !showImport && (
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => setShowExport(true)}
                                className="w-full py-3 rounded-xl bg-white text-black font-semibold hover:bg-white/90 transition-all"
                            >
                                Backup Wallet (Export JSON)
                            </button>
                            <button
                                onClick={() => setShowImport(true)}
                                className="w-full py-3 rounded-xl border border-white/20 hover:bg-white/5 transition-all font-medium"
                            >
                                Restore from Backup
                            </button>
                        </div>
                    )}

                    {showExport && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                            <p className="text-sm text-yellow-400 font-medium">Protect your backup with a password.</p>
                            <input
                                type="password"
                                placeholder="New Backup Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-white/40"
                            />
                            <div className="flex gap-2">
                                <button onClick={handleExport} className="flex-1 py-2 bg-green-600 rounded-lg text-sm font-bold">Download JSON</button>
                                <button onClick={() => setShowExport(false)} className="px-4 py-2 border border-white/10 rounded-lg text-sm">Cancel</button>
                            </div>
                        </div>
                    )}

                    {showImport && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                            <textarea
                                placeholder="Paste your Keystore JSON here..."
                                value={importJson}
                                onChange={(e) => setImportJson(e.target.value)}
                                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-xs font-mono h-24 focus:outline-none focus:border-white/40"
                            />
                            <input
                                type="password"
                                placeholder="Keystore Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-white/40"
                            />
                            <div className="flex gap-2">
                                <button onClick={handleImport} className="flex-1 py-2 bg-blue-600 rounded-lg text-sm font-bold">Restore Wallet</button>
                                <button onClick={() => setShowImport(false)} className="px-4 py-2 border border-white/10 rounded-lg text-sm">Cancel</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Warnings */}
            <div className="p-6 rounded-2xl border border-red-500/20 bg-red-500/5 text-red-200">
                <h3 className="font-bold flex items-center gap-2 mb-2">
                    ⚠️ Risks of Device Login
                </h3>
                <ul className="text-sm space-y-2 list-disc list-inside opacity-80">
                    <li>Clearing "All Site Data" in Chrome settings WILL delete your wallet.</li>
                    <li>Satelink cannot recover your wallet if you lose your password.</li>
                    <li>Always store your backup JSON in a secure offline location.</li>
                </ul>
            </div>
        </div>
    );
}
