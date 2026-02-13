"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Wifi, Router, QrCode } from 'lucide-react';

export default function RouterOnboarding() {
    const [step, setStep] = useState(1);
    const [serial, setSerial] = useState('');

    return (
        <div className="max-w-xl mx-auto space-y-8">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Edge Router Setup</h1>
                <p className="text-zinc-400">Pair your Satelink Edge Device to start sharing bandwidth.</p>
            </div>

            <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                    <div className="flex justify-center mb-4">
                        <div className="h-16 w-16 bg-blue-500/10 rounded-full flex items-center justify-center">
                            {step === 1 && <Router className="h-8 w-8 text-blue-500" />}
                            {step === 2 && <Wifi className="h-8 w-8 text-blue-500" />}
                            {step === 3 && <QrCode className="h-8 w-8 text-blue-500" />}
                        </div>
                    </div>
                    <CardTitle className="text-center text-xl">
                        {step === 1 && "Prepare Device"}
                        {step === 2 && "Connect to Wi-Fi"}
                        {step === 3 && "Pair Device"}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {step === 1 && (
                        <div className="space-y-4">
                            <p className="text-center text-zinc-300">
                                Plug in your Satelink Router to power and your internet modem via WAN port.
                                Wait for the LED to turn solid amber.
                            </p>
                            <Button className="w-full" onClick={() => setStep(2)}>
                                LED is Solid Amber
                            </Button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <p className="text-center text-zinc-300">
                                On your phone or laptop, connect to the Wi-Fi network named:
                                <br />
                                <span className="font-bold text-white">Satelink-Setup</span>
                            </p>
                            <div className="p-4 bg-zinc-950 rounded border border-zinc-800 text-center text-sm">
                                Password: <span className="font-mono font-bold text-blue-400">setup123</span>
                            </div>
                            <Button className="w-full" onClick={() => setStep(3)}>
                                I'm Connected
                            </Button>
                            <Button variant="ghost" className="w-full" onClick={() => setStep(1)}>
                                Back
                            </Button>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-4">
                            <p className="text-center text-zinc-300">
                                Enter the Serial Number found on the bottom of the device.
                            </p>
                            <Input
                                placeholder="S/N: STL-XXXX-XXXX"
                                className="text-center font-mono uppercase"
                                value={serial}
                                onChange={(e) => setSerial(e.target.value)}
                            />

                            <div className="flex items-center justify-center p-6 border-2 border-dashed border-zinc-800 rounded-lg bg-zinc-900/50">
                                <div className="text-center space-y-2">
                                    <QrCode className="h-12 w-12 text-zinc-600 mx-auto" />
                                    <p className="text-xs text-zinc-500">Scan QR Code on device</p>
                                </div>
                            </div>

                            <Button className="w-full bg-green-600 hover:bg-green-700">
                                Complete Pair
                            </Button>
                            <Button variant="ghost" className="w-full" onClick={() => setStep(2)}>
                                Back
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="flex justify-center gap-2">
                {[1, 2, 3].map((s) => (
                    <div
                        key={s}
                        className={`h-2 w-2 rounded-full transition-colors ${s === step ? 'bg-blue-500' : 'bg-zinc-800'}`}
                    />
                ))}
            </div>
        </div>
    );
}
