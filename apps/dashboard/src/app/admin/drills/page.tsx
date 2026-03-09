"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Zap, ShieldAlert, Database, PlayCircle, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader, ErrorBanner } from '@/components/admin/admin-shared';

export default function DrillsPage() {
    const [running, setRunning] = useState<string | null>(null);
    const [lastResult, setLastResult] = useState<any>(null);
    const [error, setError] = useState('');

    const runDrill = async (type: string) => {
        setRunning(type);
        setError('');
        setLastResult(null);
        try {
            const res = await api.post(`/admin/drills/${type}/run`);
            setLastResult({ type, ...res.data.result });
        } catch (e: any) {
            setError(e.response?.data?.error || `Drill ${type} failed`);
        } finally {
            setRunning(null);
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
            <PageHeader
                title="Operational Drills"
                subtitle="Execute standardized drills to verify system resilience and safety mechanisms."
            />

            {error && <ErrorBanner message={error} />}

            {lastResult && (
                <Alert className={lastResult.success ? "border-emerald-500/50 bg-emerald-500/10" : "border-red-500/50 bg-red-500/10"}>
                    <AlertTitle className={lastResult.success ? "text-emerald-400" : "text-red-400"}>
                        {lastResult.success ? "Drill Passed" : "Drill Failed"}
                    </AlertTitle>
                    <AlertDescription className="text-zinc-300 mt-2">
                        <div className="font-mono text-sm">{lastResult.type.toUpperCase()}</div>
                        <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                            {lastResult.details.map((d: string, i: number) => (
                                <li key={i}>{d}</li>
                            ))}
                        </ul>
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Kill Switch Drill */}
                <Card className="bg-zinc-900 border-zinc-800 border-l-4 border-l-red-500">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-500">
                            <Zap className="h-5 w-5" />
                            Kill Switch Drill
                        </CardTitle>
                        <CardDescription>
                            Verifies that Safe Mode can be triggered, blocks ops, and exits cleanly.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            variant="destructive"
                            className="w-full"
                            onClick={() => runDrill('kill-switch')}
                            disabled={!!running}
                        >
                            {running === 'kill-switch' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PlayCircle className="h-4 w-4 mr-2" />}
                            Run Drill
                        </Button>
                    </CardContent>
                </Card>

                {/* Abuse Drill */}
                <Card className="bg-zinc-900 border-zinc-800 border-l-4 border-l-amber-500">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-amber-500">
                            <ShieldAlert className="h-5 w-5" />
                            Abuse Firewall Drill
                        </CardTitle>
                        <CardDescription>
                            Simulates an attack to verify auto-blocking and metrics.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            variant="outline"
                            className="w-full border-amber-900 text-amber-500 hover:bg-amber-950"
                            onClick={() => runDrill('abuse')}
                            disabled={!!running}
                        >
                            {running === 'abuse' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PlayCircle className="h-4 w-4 mr-2" />}
                            Run Drill
                        </Button>
                    </CardContent>
                </Card>

                {/* Recovery Drill */}
                <Card className="bg-zinc-900 border-zinc-800 border-l-4 border-l-blue-500">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-blue-500">
                            <Database className="h-5 w-5" />
                            Recovery Drill
                        </CardTitle>
                        <CardDescription>
                            Forces WAL checkpoints and verifies DB integrity.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            variant="outline"
                            className="w-full border-blue-900 text-blue-500 hover:bg-blue-950"
                            onClick={() => runDrill('recovery')}
                            disabled={!!running}
                        >
                            {running === 'recovery' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PlayCircle className="h-4 w-4 mr-2" />}
                            Run Drill
                        </Button>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
