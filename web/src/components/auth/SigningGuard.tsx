"use client";

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';
import { useUserMode } from '@/hooks/useUserMode';

interface SignRequest {
    message: string;
    domain: string;
    confirm: () => void;
    cancel: () => void;
}

export function SigningGuard() {
    const [request, setRequest] = useState<SignRequest | null>(null);

    useEffect(() => {
        const handler = (e: CustomEvent) => {
            console.log("Signing Guard Intercepted Request");
            setRequest(e.detail);
        };
        window.addEventListener('satelink:sign_request' as any, handler);
        return () => window.removeEventListener('satelink:sign_request' as any, handler);
    }, []);

    const { mode } = useUserMode();

    if (!request) return null;

    // Extract scope if present (simple regex or parsing)
    const scopeMatch = request.message.match(/action: (.*)\n/);
    const scope = scopeMatch ? scopeMatch[1] : 'Authentication';

    const isSimple = mode === 'SIMPLE';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <Card className="w-full max-w-md bg-zinc-950 border-zinc-800 shadow-2xl">
                <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                            <ShieldAlert className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">
                                {isSimple ? "Confirm It's You" : "Signature Request"}
                            </CardTitle>
                            <CardDescription>
                                {isSimple ? "Please verify this action to proceed." : "You are signing a message to prove identity."}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">

                    {/* Domain Check */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                        <span className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">Origin</span>
                        <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${request.domain === window.location.host ? 'text-green-400' : 'text-red-400'}`}>
                                {request.domain}
                            </span>
                            {request.domain === window.location.host ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : (
                                <XCircle className="w-4 h-4 text-red-500" />
                            )}
                        </div>
                    </div>

                    {/* Scope */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                        <span className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">Action</span>
                        <span className="text-sm font-medium text-white">{scope}</span>
                    </div>

                    {/* Message Preview */}
                    <div className="space-y-2">
                        <label className="text-xs text-zinc-500 font-medium">Message Content</label>
                        <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/50 font-mono text-[10px] text-zinc-400 max-h-32 overflow-y-auto whitespace-pre-wrap">
                            {request.message}
                        </div>
                    </div>

                    <div className="text-xs text-zinc-500 text-center">
                        Only sign if you initiated this action.
                    </div>
                </CardContent>
                <CardFooter className="flex gap-3 justify-end border-t border-zinc-900 pt-4">
                    <Button
                        variant="ghost"
                        onClick={() => {
                            request.cancel();
                            setRequest(null);
                        }}
                        className="hover:bg-zinc-900 text-zinc-400 hover:text-white"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={() => {
                            request.confirm();
                            setRequest(null);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white"
                    >
                        Sign & Approve
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
