'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getActiveAddress } from '@/lib/embeddedWallet';

/**
 * Phase H2 — Recovery Kit UX (Backup Nudge)
 * A non-blocking banner that nudges users to backup their wallet.
 */
export function BackupNudge() {
    const router = useRouter();
    const [isVisible, setIsVisible] = useState(false);
    const [address, setAddress] = useState<string | null>(null);

    useEffect(() => {
        const checkNudge = async () => {
            const addr = await getActiveAddress();
            if (!addr) return;
            setAddress(addr);

            // Check if user dismissed it recently
            const dismissedUntil = localStorage.getItem('satelink_backup_nudge_dismissed');
            if (dismissedUntil && Date.now() < parseInt(dismissedUntil)) {
                return;
            }

            // Simple heuristic for "meaningful action" or 24h:
            // For MVP, we show it if they have an address and it's not dismissed.
            setIsVisible(true);
        };

        checkNudge();
    }, []);

    const handleDismiss = () => {
        // Remind me in 24 hours
        const until = Date.now() + (24 * 60 * 60 * 1000);
        localStorage.setItem('satelink_backup_nudge_dismissed', until.toString());
        setIsVisible(false);
    };

    const handleBackup = () => {
        router.push('/account/security');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-right-4">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-5 rounded-2xl shadow-2xl max-w-sm">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center shrink-0">
                        ⚠️
                    </div>
                    <div className="space-y-2">
                        <h4 className="font-bold text-sm">Backup Your Wallet</h4>
                        <p className="text-xs text-white/60 leading-relaxed">
                            Your wallet is currently <strong>device-bound</strong>. If you clear site data, you'll lose access to
                            <span className="font-mono ml-1">{address?.slice(0, 6)}...{address?.slice(-4)}</span>.
                        </p>
                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={handleBackup}
                                className="px-4 py-2 bg-white text-black text-xs font-bold rounded-lg hover:bg-white/90 transition-colors"
                            >
                                Backup Now
                            </button>
                            <button
                                onClick={handleDismiss}
                                className="px-4 py-2 border border-white/10 text-white/50 text-xs font-medium rounded-lg hover:bg-white/5 transition-colors"
                            >
                                Remind Later
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
