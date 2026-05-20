"use client";

import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Smartphone, Server, Box, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

export default function EdgeOnboarding() {
    const { user } = useAuth();
    const [code, setCode] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [linkedDevice, setLinkedDevice] = useState<string | null>(null);

    if (!user) return null;

    const handlePair = async () => {
        if (!code || code.length < 6) {
            toast.error("Please enter a valid 6-digit code");
            return;
        }

        setStatus('loading');
        try {
            const res = await api.post('/pair/confirm', { pair_code: code });
            if (res.data.ok) {
                setStatus('success');
                setLinkedDevice(res.data.device_id);
                toast.success("Device paired successfully!");
            }
        } catch (err: any) {
            setStatus('error');
            toast.error(err.response?.data?.error || "Pairing failed");
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Companion Edge Node</h1>
                <p className="text-zinc-400">
                    If your ISP router is locked, run Satelink on a companion device connected to the same network.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Method Selection */}
                <Card className="md:col-span-2 bg-zinc-900/50 border-zinc-800">
                    <CardHeader>
                        <CardTitle>Choose Your Device</CardTitle>
                        <CardDescription>Select how you want to run the Satelink Companion.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="android" className="space-y-6">
                            <TabsList className="grid w-full grid-cols-3 bg-zinc-900 border border-zinc-800">
                                <TabsTrigger value="android">Android App</TabsTrigger>
                                <TabsTrigger value="docker">Docker (PC/Mac)</TabsTrigger>
                                <TabsTrigger value="box">Plug & Play</TabsTrigger>
                            </TabsList>

                            <TabsContent value="android" className="space-y-4">
                                <div className="flex items-start gap-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                                    <Smartphone className="h-6 w-6 text-green-500 mt-1" />
                                    <div>
                                        <h3 className="font-semibold text-green-400">Recommended for most users</h3>
                                        <p className="text-sm text-zinc-400 mt-1">
                                            Download the Satelink App functionality on your Android phone. Keep it connected to Wi-Fi.
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-sm font-medium">Steps:</p>
                                    <ol className="list-decimal list-inside text-sm text-zinc-400 space-y-1 ml-2">
                                        <li>Download <strong>Satelink Companion</strong> from Play Store (Coming Soon).</li>
                                        <li>Open the app and tap "Pair Device".</li>
                                        <li>Enter the 6-digit code shown on the app below.</li>
                                    </ol>
                                </div>
                            </TabsContent>

                            <TabsContent value="docker" className="space-y-4">
                                <div className="flex items-start gap-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                    <Server className="h-6 w-6 text-blue-500 mt-1" />
                                    <div>
                                        <h3 className="font-semibold text-blue-400">For Advanced Users</h3>
                                        <p className="text-sm text-zinc-400 mt-1">
                                            Run a lightweight container on your everyday computer.
                                        </p>
                                    </div>
                                </div>
                                <div className="p-3 bg-zinc-950 rounded border border-zinc-800 font-mono text-xs text-zinc-300 break-all">
                                    docker run -it satelink/companion pair
                                </div>
                            </TabsContent>

                            <TabsContent value="box" className="space-y-4">
                                <div className="flex items-start gap-4 p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                                    <Box className="h-6 w-6 text-purple-500 mt-1" />
                                    <div>
                                        <h3 className="font-semibold text-purple-400">Satelink Box</h3>
                                        <p className="text-sm text-zinc-400 mt-1">
                                            Pre-configured hardware sent to your door.
                                        </p>
                                    </div>
                                </div>
                                <Button disabled variant="outline" className="w-full">Order Now (Out of Stock)</Button>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>

                {/* Pairing UI */}
                <Card className="bg-zinc-900 border-zinc-800 h-fit">
                    <CardHeader>
                        <CardTitle>Link Device</CardTitle>
                        <CardDescription>Enter the code from your device.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {status === 'success' ? (
                            <div className="flex flex-col items-center justify-center py-6 space-y-4 text-center">
                                <div className="h-12 w-12 bg-green-500/20 rounded-full flex items-center justify-center">
                                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-green-400">Paired Successfully</h3>
                                    <p className="text-xs text-zinc-500 mt-1">Device ID: {linkedDevice?.slice(0, 8)}...</p>
                                </div>
                                <Button variant="outline" className="w-full" onClick={() => {
                                    setStatus('idle');
                                    setCode('');
                                    setLinkedDevice(null);
                                }}>
                                    Pair Another
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Input
                                        placeholder="000000"
                                        className="text-center text-2xl tracking-[0.5em] font-mono h-14 bg-zinc-950 border-zinc-700"
                                        maxLength={6}
                                        value={code}
                                        onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                                        disabled={status === 'loading'}
                                    />
                                    <p className="text-xs text-center text-zinc-500">
                                        Enter the 6-digit pairing code
                                    </p>
                                </div>

                                {status === 'error' && (
                                    <Alert variant="destructive" className="py-2">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertTitle className="text-xs">Invalid Code</AlertTitle>
                                        <AlertDescription className="text-xs">
                                            Please check the code and try again.
                                        </AlertDescription>
                                    </Alert>
                                )}

                                <Button
                                    className="w-full bg-blue-600 hover:bg-blue-700"
                                    onClick={handlePair}
                                    disabled={code.length !== 6 || status === 'loading'}
                                >
                                    {status === 'loading' ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        "Link Device"
                                    )}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
