"use client";

import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Copy, Terminal, Server, Activity } from 'lucide-react';
import { StatCard } from '@/components/ui-custom/stat-card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function NodeOpsOnboarding() {
    const { user } = useAuth();
    const [copied, setCopied] = useState(false);

    if (!user) return null;

    const dockerCommand = `docker run -d \\
  --name satelink-node \\
  --restart unless-stopped \\
  -e WALLET=${user.wallet} \\
  -e POOL=wss://pool.satelink.network \\
  satelink/node:latest`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(dockerCommand);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Node Setup</h1>
                <p className="text-zinc-400">
                    Follow these steps to deploy your Satelink Node and start earning.
                    <br />
                    <a href="/onboarding/edge" className="text-blue-500 hover:underline text-sm">
                        ISP Router Locked? Try Companion Edge Node →
                    </a>
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Terminal className="h-5 w-5 text-blue-500" />
                            Step 1: Run Docker Container
                        </CardTitle>
                        <CardDescription>
                            Execute this command on your VPS or dedicated server.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="relative group">
                            <pre className="bg-zinc-950 p-4 rounded-lg text-sm text-zinc-300 font-mono overflow-x-auto border border-zinc-800">
                                {dockerCommand}
                            </pre>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800 hover:bg-zinc-700"
                                onClick={copyToClipboard}
                            >
                                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                        <p className="text-xs text-zinc-500 mt-4">
                            * Requires Docker installed. Supported OS: Ubuntu 20.04+, Debian 11+, CentOS 8+.
                        </p>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="bg-zinc-900/50 border-zinc-800">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Server className="h-5 w-5 text-purple-500" />
                                Step 2: Verification
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Alert className="bg-blue-500/10 border-blue-500/20 text-blue-400">
                                <AlertTitle>Waiting for heartbeat...</AlertTitle>
                                <AlertDescription>
                                    The network will automatically detect your node once it starts broadcasting.
                                </AlertDescription>
                            </Alert>

                            <StatCard
                                title="Connection Status"
                                value="Offline"
                                icon={Activity}
                                description="Last seen: Never"
                            />
                        </CardContent>
                    </Card>

                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                        Check Status Again
                    </Button>
                </div>
            </div>
        </div>
    );
}
