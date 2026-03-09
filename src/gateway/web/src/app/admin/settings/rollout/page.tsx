"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Flag, Save, Check, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader, ErrorBanner } from '@/components/admin/admin-shared';

interface FeatureFlag {
    key: string;
    mode: 'OFF' | 'ON' | 'PERCENT' | 'WHITELIST';
    percent: number;
    whitelist: string[];
    description: string;
    updated_at: number;
    updated_by: string;
}

export default function RolloutSettingsPage() {
    const [flags, setFlags] = useState<FeatureFlag[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [evalWallet, setEvalWallet] = useState('');
    const [evalResult, setEvalResult] = useState<Record<string, boolean>>({});

    const fetchFlags = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/settings/flags');
            if (res.data.ok) {
                setFlags(res.data.flags.sort((a: any, b: any) => a.key.localeCompare(b.key)));
            }
        } catch (e: any) {
            setError(e.response?.data?.error || 'Failed to fetch flags');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFlags();
    }, []);

    const handleUpdate = async (flag: FeatureFlag, updates: Partial<FeatureFlag>) => {
        try {
            const newFlag = { ...flag, ...updates };
            await api.post(`/admin/settings/flags/${flag.key}`, newFlag);
            fetchFlags(); // Refresh
        } catch (e: any) {
            setError(e.response?.data?.error || 'Failed to update flag');
        }
    };

    // Simple client-side evaluator visualizer (matches backend logic roughly)
    const checkEval = (flag: FeatureFlag) => {
        if (flag.mode === 'OFF') return false;
        if (flag.mode === 'ON') return true;
        if (flag.mode === 'WHITELIST') return flag.whitelist.includes(evalWallet);
        if (flag.mode === 'PERCENT') {
            // We can't easily replicate the MD5 hash logic here exactly without lib,
            // so we just show "Depends on Hash". 
            // Or we call backend? No endpoint for eval yet.
            return "Probabilistic";
        }
        return false;
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
            <PageHeader
                title="Rollout Settings"
                subtitle="Control feature flags, canary releases, and progressive rollouts."
            />

            {error && <ErrorBanner message={error} />}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-4">
                    {flags.map(flag => (
                        <Card key={flag.key} className="bg-zinc-900 border-zinc-800">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Flag className="h-4 w-4 text-blue-500" />
                                            {flag.key}
                                        </CardTitle>
                                        <CardDescription>{flag.description}</CardDescription>
                                    </div>
                                    <Badge variant={flag.mode === 'ON' ? 'default' : 'outline'} className={
                                        flag.mode === 'ON' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' :
                                            flag.mode === 'OFF' ? 'text-zinc-500' : 'text-blue-400'
                                    }>
                                        {flag.mode}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                    <div className="space-y-2">
                                        <label className="text-xs text-zinc-400">Mode</label>
                                        <Select
                                            value={flag.mode}
                                            onValueChange={(v: any) => handleUpdate(flag, { mode: v })}
                                        >
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="OFF">OFF (Disabled)</SelectItem>
                                                <SelectItem value="ON">ON (Global)</SelectItem>
                                                <SelectItem value="PERCENT">Percentage Rollout</SelectItem>
                                                <SelectItem value="WHITELIST">Whitelist Only</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {flag.mode === 'PERCENT' && (
                                        <div className="space-y-2">
                                            <label className="text-xs text-zinc-400">Rollout % (0-100)</label>
                                            <div className="flex gap-2">
                                                <Input
                                                    type="number"
                                                    defaultValue={flag.percent}
                                                    onBlur={(e) => handleUpdate(flag, { percent: parseInt(e.target.value) })}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {flag.mode === 'WHITELIST' && (
                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-xs text-zinc-400">Allowed Wallets (JSON Array)</label>
                                            <Input
                                                defaultValue={JSON.stringify(flag.whitelist)}
                                                onBlur={(e) => {
                                                    try {
                                                        const parsed = JSON.parse(e.target.value);
                                                        handleUpdate(flag, { whitelist: parsed });
                                                    } catch (err) {
                                                        alert("Invalid JSON array");
                                                    }
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="mt-2 text-xs text-zinc-600">
                                    Updated by {flag.updated_by} at {new Date(flag.updated_at).toLocaleString()}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Evaluator Side Panel */}
                <div className="space-y-4">
                    <Card className="bg-zinc-900 border-zinc-800">
                        <CardHeader>
                            <CardTitle className="text-sm">Canary Evaluator</CardTitle>
                            <CardDescription className="text-xs">Check if a wallet has access</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Input
                                placeholder="0xWallet..."
                                value={evalWallet}
                                onChange={(e) => setEvalWallet(e.target.value)}
                            />
                            <div className="space-y-2">
                                {flags.map(f => {
                                    const result = checkEval(f);
                                    return (
                                        <div key={f.key} className="flex justify-between items-center text-sm p-2 bg-zinc-950 rounded">
                                            <span className="text-zinc-400">{f.key}</span>
                                            {result === true ? <Check className="h-4 w-4 text-emerald-500" /> :
                                                result === false ? <span className="text-zinc-600">-</span> :
                                                    <span className="text-blue-500 text-xs">{result}</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
