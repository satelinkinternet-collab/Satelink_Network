"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock } from 'lucide-react';
import axios from 'axios';
import { signMessage } from '@/lib/embeddedWallet';
import { toast } from 'sonner';

interface ReAuthProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (token: string) => void;
    scope: string;
    wallet: string;
}

export function ReAuthDialog({ isOpen, onClose, onSuccess, scope, wallet }: ReAuthProps) {
    const [loading, setLoading] = useState(false);

    const handleReAuth = async () => {
        setLoading(true);
        try {
            // 1. Start Reauth
            const startRes = await axios.post('/auth/reauth/start', { wallet, scope });
            if (!startRes.data.ok) throw new Error(startRes.data.error);

            const { nonce, message } = startRes.data;

            // 2. Sign (triggers SigningGuard)
            const signature = await signMessage(message);

            // 3. Finish
            const finishRes = await axios.post('/auth/reauth/finish', {
                wallet,
                scope,
                signature,
                nonce
            });

            if (!finishRes.data.ok) throw new Error(finishRes.data.error);

            toast.success("Identity verified");
            onSuccess(finishRes.data.reauth_token);
            onClose();

        } catch (e: any) {
            console.error(e);
            toast.error(e.message || "Re-authentication failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-zinc-800 text-zinc-100">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Lock className="w-5 h-5 text-amber-500" />
                        Security Check
                    </DialogTitle>
                    <DialogDescription>
                        Please sign a message to confirm this sensitive action: <span className="text-white font-medium">{scope}</span>.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
                    <Button onClick={handleReAuth} disabled={loading} className="bg-amber-600 hover:bg-amber-500 text-white">
                        {loading ? 'Verifying...' : 'Sign to Confirm'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
