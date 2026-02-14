'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
import {
        getActiveAddress,
        createAndStoreWallet,
        signMessage,
        getDevicePublicId
    } from '@/lib/embeddedWallet';
import { connectMetaMask, signMessageMetaMask } from '@/lib/metaMask';
import axios from 'axios';
import { toast } from 'sonner';

/**
 * Phase 37 & F — Login Page
 * Supports:
 * 1. Silent Embedded Wallet (Create/Get -> Sign)
 * 2. External Wallet (MetaMask -> Sign)
 */
export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'initial' | 'generating' | 'signing'>('initial');

    // Shared Auth Flow (Nonce -> Sign -> JWT)
    const authenticate = async (address: string, signer: (msg: string) => Promise<string | null>) => {
        setLoading(true);
        try {
            // 2. Start Auth (Get Nonce)
            setStep('signing');
            const startRes = await axios.post('/auth/embedded/start', { address });
            if (!startRes.data.ok) throw new Error(startRes.data.error);

            const { nonce, message_template } = startRes.data;
            const message = message_template
                .replace('${nonce}', nonce)
                .replace('${address}', address)
                .replace('${timestamp}', startRes.data.created_at || Date.now());

            // 3. Sign Message
            const signature = await signer(message);
            if (!signature) {
                setStep('initial');
                setLoading(false);
                return; // User rejected or failed
            }

            // 4. Finish Auth (Verify & JWT)
            const finishRes = await axios.post('/auth/embedded/finish', {
                address,
                signature,
                device_public_id: getDevicePublicId()
            });

            if (finishRes.data.ok) {
                toast.success('Authenticated successfully');
                router.push('/admin/command-center');
            } else {
                throw new Error(finishRes.data.error);
            }
        } catch (error: any) {
            console.error('Login failed:', error);
            toast.error(error.response?.data?.error || error.message || 'Login failed');
            setStep('initial');
            setLoading(false);
        }
    };

    const handleContinue = async () => {
        setLoading(true);
        try {
            // 1. Get or Generate Embedded Wallet
            setStep('generating');
            let address = await getActiveAddress();
            if (!address) {
                address = await createAndStoreWallet();
                toast.success('Secure device wallet created');
            }
            // Use embedded signer
            await authenticate(address, (msg) => signMessage(msg));
        } catch (error: any) {
            console.error('Embedded init failed:', error);
            toast.error('Failed to initialize secure wallet');
            setLoading(false);
            setStep('initial');
        }
    };

    const handleConnectMetaMask = async () => {
        setLoading(true);
        const address = await connectMetaMask();
        if (address) {
            // Use MetaMask signer
            await authenticate(address, (msg) => signMessageMetaMask(address, msg));
        } else {
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
                    <p className="text-white/50 text-sm">Decentralized connectivity starting with your device.</p>
                </div>

                <div className="space-y-4">
                    <button
                        onClick={handleContinue}
                        disabled={loading}
                        className="w-full py-4 rounded-xl bg-white text-black font-semibold hover:bg-white/90 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></span>
                                {step === 'generating' ? 'Initializing...' : 'Authorizing...'}
                            </span>
                        ) : (
                            <>
                                Continue
                                <span className="group-hover:translate-x-1 transition-transform">→</span>
                            </>
                        )}
                    </button>

                    <button
                        onClick={handleConnectMetaMask}
                        disabled={loading}
                        className="w-full py-4 rounded-xl border border-white/20 hover:bg-white/5 transition-all text-sm font-medium text-white/70"
                    >
                        I already have a wallet
                    </button>
                </div>

                <div className="mt-10 pt-8 border-t border-white/5 text-center">
                    <p className="text-[10px] uppercase tracking-widest text-white/30 font-medium">
                        Non-Custodial • Device Bound • End-to-End Encrypted
                    </p>
                </div>
            </div>

            <p className="mt-8 text-white/40 text-xs">
                By continuing, you agree to our Terms of Service.
            </p>
        </div>
    );
}
