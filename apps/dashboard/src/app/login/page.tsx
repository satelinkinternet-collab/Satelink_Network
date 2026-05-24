"use client";

import React, { useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { connectMetaMask, signMessageMetaMask, isMetaMaskInstalled } from "@/lib/metaMask";
import { Loader2, Wallet, AlertCircle } from "lucide-react";

type AuthStep = 'idle' | 'connecting' | 'signing' | 'verifying';

export default function LoginPage() {
    const { login } = useAuth();
    const [step, setStep] = useState<AuthStep>('idle');
    const [address, setAddress] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleWalletLogin = async () => {
        setError(null);
        setStep('connecting');

        try {
            // Step 1: Connect wallet and get address
            const walletAddress = await connectMetaMask();
            if (!walletAddress) {
                setStep('idle');
                return;
            }
            setAddress(walletAddress);

            // Step 2: Request nonce from backend
            setStep('signing');
            const startRes = await api.post("/start", { address: walletAddress });

            if (!startRes.data?.ok || !startRes.data?.nonce) {
                throw new Error(startRes.data?.error || "Failed to get authentication challenge");
            }

            const { nonce, created_at } = startRes.data;

            // Step 3: Construct and sign the message
            const message = `Welcome to Satelink!\n\nAuthorize your device by signing this nonce: ${nonce}\n\nAddress: ${walletAddress}\nTimestamp: ${created_at}`;

            const signature = await signMessageMetaMask(walletAddress, message);
            if (!signature) {
                setStep('idle');
                return;
            }

            // Step 4: Verify signature and get JWT
            setStep('verifying');
            const finishRes = await api.post("/finish", {
                address: walletAddress,
                signature,
            });

            if (!finishRes.data?.ok || !finishRes.data?.token) {
                throw new Error(finishRes.data?.error || "Authentication failed");
            }

            // Step 5: Store JWT and redirect
            toast.success(`Welcome, ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`);
            await login(finishRes.data.token);

        } catch (err: any) {
            console.error("Login failed:", err);
            const errorMsg = err?.response?.data?.error || err.message || "Login failed";
            setError(errorMsg);
            toast.error(errorMsg);
            setStep('idle');
        }
    };

    const getButtonText = () => {
        switch (step) {
            case 'connecting': return 'Connecting Wallet...';
            case 'signing': return 'Sign Message in Wallet...';
            case 'verifying': return 'Verifying...';
            default: return 'Connect Wallet';
        }
    };

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full p-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-white rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                        <div className="w-8 h-8 bg-black rounded-lg transform rotate-45"></div>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">
                        Welcome to Satelink
                    </h1>
                    <p className="text-white/50 text-sm">
                        Connect your wallet to access the network.
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-400">{error}</p>
                    </div>
                )}

                {address && step !== 'idle' && (
                    <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
                        <p className="text-xs text-white/50 mb-1">Connected Wallet</p>
                        <p className="font-mono text-sm text-white/90">
                            {address.slice(0, 10)}...{address.slice(-8)}
                        </p>
                    </div>
                )}

                <div className="space-y-4">
                    <button
                        onClick={handleWalletLogin}
                        disabled={step !== 'idle'}
                        className="w-full py-4 rounded-xl bg-white text-black font-semibold hover:bg-white/90 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                        {step !== 'idle' ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Wallet className="w-5 h-5" />
                        )}
                        {getButtonText()}
                    </button>

                    {!isMetaMaskInstalled() && (
                        <p className="text-center text-xs text-white/40">
                            MetaMask not detected.{" "}
                            <a
                                href="https://metamask.io/download/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:underline"
                            >
                                Install MetaMask
                            </a>
                        </p>
                    )}
                </div>

                <div className="mt-8 pt-6 border-t border-white/10">
                    <p className="text-center text-xs text-white/30">
                        By connecting, you agree to sign a message to verify wallet ownership.
                        <br />
                        No gas fees or transactions required.
                    </p>
                </div>
            </div>
        </div>
    );
}
