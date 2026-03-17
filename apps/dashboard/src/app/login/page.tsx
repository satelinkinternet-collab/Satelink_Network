"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { ethers } from 'ethers';
import { Wallet, ShieldCheck, Loader2, AlertTriangle } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const isDev = process.env.NODE_ENV === 'development';

    // ── Production: Wallet Signature Login ──
    const handleWalletLogin = async () => {
        setLoading(true);
        setError(null);

        if (typeof window === 'undefined' || !(window as any).ethereum) {
            setError('No wallet detected. Install MetaMask or another EVM wallet.');
            setLoading(false);
            return;
        }

        try {
            const provider = new ethers.BrowserProvider((window as any).ethereum);
            const accounts = await provider.send("eth_requestAccounts", []);
            const address = accounts[0];
            if (!address) throw new Error('No account selected');

            // Step 1: Request nonce from backend
            const startRes = await api.post('/auth/embedded/start', { address });
            if (!startRes.data?.ok) throw new Error(startRes.data?.error || 'Failed to get nonce');

            const { nonce, created_at } = startRes.data;

            // Step 2: Sign the message
            const message = `Welcome to Satelink!\n\nAuthorize your device by signing this nonce: ${nonce}\n\nAddress: ${address}\nTimestamp: ${created_at}`;
            const signer = await provider.getSigner();
            const signature = await signer.signMessage(message);

            // Step 3: Verify signature and get JWT
            const finishRes = await api.post('/auth/embedded/finish', {
                address,
                signature,
                device_public_id: `web-${Date.now()}`
            });

            if (!finishRes.data?.ok || !finishRes.data?.token) {
                throw new Error(finishRes.data?.error || 'Authentication failed');
            }

            await login(finishRes.data.token);
            toast.success('Wallet connected successfully');
        } catch (err: any) {
            const msg = err?.code === 'ACTION_REJECTED'
                ? 'Signature rejected by user'
                : (err?.response?.data?.error || err.message || 'Login failed');
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    // ── Dev-only: Role-based Test Login ──
    const handleDevLogin = async (role: string, wallet: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.post('/__test/auth/login', { wallet, role });
            if (res.data?.token) {
                await login(res.data.token);
                toast.success(`Dev login as ${role}`);
            } else {
                throw new Error('No token received');
            }
        } catch (err: any) {
            setError(err.message || 'Dev login failed');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full p-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-white rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                        <div className="w-8 h-8 bg-black rounded-lg transform rotate-45"></div>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome to Satelink</h1>
                    <p className="text-white/50 text-sm">Connect your wallet to access the network.</p>
                </div>

                {error && (
                    <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="space-y-4">
                    {/* Primary: Wallet Login */}
                    <button
                        onClick={handleWalletLogin}
                        disabled={loading}
                        className="w-full py-3.5 rounded-xl bg-white text-black font-semibold hover:bg-white/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Wallet className="w-4 h-4" />
                        )}
                        Connect Wallet
                    </button>

                    <div className="flex items-center gap-2 text-xs text-white/30 px-2">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Sign a message to prove ownership. No gas fees.</span>
                    </div>

                    {/* Dev-only: Test Role Buttons */}
                    {isDev && (
                        <>
                            <div className="border-t border-white/10 pt-4 mt-4">
                                <p className="text-xs text-yellow-400/60 text-center mb-3 font-mono">DEV MODE — Test Logins</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { role: 'admin_super', wallet: '0xadmin_super', label: 'Admin' },
                                        { role: 'node_operator', wallet: '0xnode_op_1', label: 'Node Op' },
                                        { role: 'builder', wallet: '0xbuilder_1', label: 'Builder' },
                                        { role: 'enterprise', wallet: '0xent_1', label: 'Enterprise' },
                                    ].map(({ role, wallet, label }) => (
                                        <button
                                            key={role}
                                            onClick={() => handleDevLogin(role, wallet)}
                                            disabled={loading}
                                            className="py-2 rounded-lg border border-white/10 hover:bg-white/5 transition-all text-xs font-medium text-white/60 disabled:opacity-50"
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
