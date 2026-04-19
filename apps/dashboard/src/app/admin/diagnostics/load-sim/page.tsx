"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Activity } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader, ErrorBanner } from '@/components/admin/admin-shared';

export default function LoadSimPage() {
    const [profile, setProfile] = useState('light');
    const [duration, setDuration] = useState('1');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [error, setError] = useState('');

    const handleRun = async () => {
        setLoading(true);
        setStatus('');
        setError('');
        try {
            const res = await api.post('/admin/diagnostics/load-sim/run', {
                profile,
                minutes: parseInt(duration)
            });
            if (res.data.ok) {
                setStatus(res.data.message);
            }
        } catch (e: any) {
            setError(e.response?.data?.error || 'Failed to start simulation');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
            <PageHeader
                title="Load Simulator"
                subtitle="Generate synthetic traffic to test system resilience"
            />

            {error && <ErrorBanner message={error} />}
            {status && <div className="p-4 mb-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-md">{status}</div>}

            <Card className="bg-zinc-900 border-zinc-800 max-w-xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-blue-500" />
                        Simulation Config
                    </CardTitle>
                    <CardDescription>
                        WARNING: This will generate real HTTP traffic against the localhost server.
                        Ensure Safe Mode triggers are active.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs text-zinc-400">Traffic Profile</label>
                        <Select value={profile} onValueChange={setProfile}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="light">Light (50 RPS)</SelectItem>
                                <SelectItem value="medium">Medium (200 RPS)</SelectItem>
                                <SelectItem value="heavy">Heavy (500 RPS) - DANGER</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs text-zinc-400">Duration (Minutes)</label>
                        <Select value={duration} onValueChange={setDuration}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">1 Minute</SelectItem>
                                <SelectItem value="5">5 Minutes</SelectItem>
                                <SelectItem value="10">10 Minutes</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Button
                        className="w-full mt-4"
                        size="lg"
                        onClick={handleRun}
                        disabled={loading}
                    >
                        {loading ? 'Starting...' : (
                            <>
                                <Play className="h-4 w-4 mr-2" /> Start Simulation
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
