"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { QrCode, RefreshCw, CheckCircle2, Loader2, Smartphone } from 'lucide-react';
import api from '@/lib/api';

export function PairingCard() {
    const [pairCode, setPairCode] = useState<string | null>(null);
    const [status, setStatus] = useState<'idle' | 'loading' | 'waiting' | 'paired'>('idle');
    const [deviceId, setDeviceId] = useState<string | null>(null);

    const requestPairing = async () => {
        setStatus('loading');
        try {
            const res = await api.post('/pair/request');
            if (res.data.pair_code) {
                setPairCode(res.data.pair_code);
                setStatus('waiting');
                toast.success('Pairing code generated');
            }
        } catch (err) {
            toast.error('Failed to generate pairing code');
            setStatus('idle');
        }
    };

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (status === 'waiting' && pairCode) {
            interval = setInterval(async () => {
                try {
                    const res = await api.get(`/pair/status/${pairCode}`);
                    if (res.data.status === 'paired') {
                        setStatus('paired');
                        setDeviceId(res.data.device_id);
                        toast.success('Device paired successfully!');
                        clearInterval(interval);
                        // Optional: Reload page or update parent state via callback
                        setTimeout(() => window.location.reload(), 2000);
                    }
                } catch (err) {
                    // Ignore polling errors
                }
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [status, pairCode]);

    if (status === 'paired') {
        return (
            <Card className="w-full max-w-md mx-auto premium-shadow border-emerald-500/50 bg-emerald-500/5 backdrop-blur-xl">
                <CardContent className="pt-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 mx-auto flex items-center justify-center mb-4">
                        <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h3 className="text-xl font-bold text-zinc-900 mb-2">Device Paired!</h3>
                    <p className="text-zinc-500 mb-6">Device ID: <span className="font-mono text-zinc-900 font-semibold">{deviceId}</span></p>
                    <Button variant="outline" className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                        Done
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-sm mx-auto shadow-2xl border-zinc-800 bg-zinc-900 text-white overflow-hidden relative">
            <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
            <CardHeader className="text-center pb-2">
                <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
                    <QrCode className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-xl font-bold">Connect Device</CardTitle>
                <CardDescription className="text-zinc-400">Link your hardware node to the network</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {status === 'idle' ? (
                    <div className="text-center space-y-4">
                        <p className="text-sm text-zinc-400">
                            Click below to generate a secure 6-digit pairing code. Enter this code on your hardware device screen.
                        </p>
                        <Button
                            onClick={requestPairing}
                            className="w-full bg-white text-zinc-900 hover:bg-zinc-200 font-bold h-12"
                        >
                            Generate Code
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="text-center">
                            <div className="text-5xl font-mono font-bold tracking-[0.2em] text-center text-white mb-2">
                                {pairCode}
                            </div>
                            <p className="text-xs text-zinc-500 uppercase tracking-widest animate-pulse">Waiting for device connection...</p>
                        </div>

                        <div className="bg-zinc-800/50 rounded-lg p-4 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                                <Smartphone className="w-4 h-4 text-blue-400" />
                            </div>
                            <div className="text-sm text-zinc-400">
                                Open <strong>Settings &gt; Link</strong> on your device and enter the code above.
                            </div>
                        </div>

                        <Button
                            variant="ghost"
                            onClick={requestPairing}
                            className="w-full text-zinc-500 hover:text-white"
                        >
                            <RefreshCw className="mr-2 h-4 w-4" /> Regenerate Code
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
