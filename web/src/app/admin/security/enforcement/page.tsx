"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Shield, ShieldAlert, ShieldCheck, RefreshCw, XCircle, Search
} from 'lucide-react';
import api from '@/lib/api';
import {
    PageHeader, ErrorBanner, DataTable, timeAgo, ConfirmDialog, useIsReadonly
} from '@/components/admin/admin-shared';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EnforcementEvent {
    id: number;
    entity_type: string;
    entity_id: string;
    decision: string;
    reason_codes_json: string;
    created_at: number;
    expires_at: number;
    created_by: string;
}

export default function EnforcementPage() {
    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState<EnforcementEvent[]>([]);
    const [error, setError] = useState('');

    // New Block State
    const [newBlockType, setNewBlockType] = useState('ip_hash');
    const [newBlockId, setNewBlockId] = useState('');
    const [newBlockReason, setNewBlockReason] = useState('manual_override');
    const [blocking, setBlocking] = useState(false);

    // Unblock
    const [confirmUnblock, setConfirmUnblock] = useState<EnforcementEvent | null>(null);
    const readonly = useIsReadonly();

    const fetchEvents = async () => {
        setError('');
        setLoading(true);
        try {
            const res = await api.get('/admin/security/enforcement?limit=100');
            if (res.data.ok) {
                setEvents(res.data.events);
            }
        } catch (e: any) {
            setError(e.response?.data?.error || 'Failed to fetch events');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    const handleBlock = async () => {
        if (!newBlockId) return;
        setBlocking(true);
        try {
            await api.post('/admin/security/enforcement/block', {
                type: newBlockType,
                id: newBlockId,
                reason: newBlockReason,
                ttl: 3600 // 1 hour default
            });
            setNewBlockId('');
            fetchEvents();
        } catch (e: any) {
            setError(e.response?.data?.error || 'Block failed');
        } finally {
            setBlocking(false);
        }
    };

    const handleUnblock = async () => {
        if (!confirmUnblock) return;
        try {
            await api.post('/admin/security/enforcement/unblock', {
                type: confirmUnblock.entity_type,
                id: confirmUnblock.entity_id
            });
            fetchEvents();
        } catch (e: any) {
            setError(e.response?.data?.error || 'Unblock failed');
        } finally {
            setConfirmUnblock(null);
        }
    };

    const columns = [
        { header: 'Type', accessorKey: 'entity_type', cell: (row: any) => <Badge variant="outline">{row.entity_type}</Badge> },
        { header: 'ID', accessorKey: 'entity_id', cell: (row: any) => <span className="font-mono text-xs">{row.entity_id}</span> },
        {
            header: 'Decision', accessorKey: 'decision', cell: (row: any) => (
                <Badge className={row.decision === 'block' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-yellow-500/10 text-yellow-500'}>
                    {row.decision}
                </Badge>
            )
        },
        {
            header: 'Reason', accessorKey: 'reason_codes_json', cell: (row: any) => {
                try { return JSON.parse(row.reason_codes_json).join(', '); } catch { return row.reason_codes_json; }
            }
        },
        { header: 'Expires', accessorKey: 'expires_at', cell: (row: any) => row.expires_at > Date.now() ? timeAgo(row.expires_at) : <span className="text-zinc-500">Expired</span> },
        {
            header: 'Actions', accessorKey: 'id', cell: (row: any) => (
                !readonly && row.decision === 'block' && row.expires_at > Date.now() && (
                    <Button variant="ghost" size="sm" onClick={() => setConfirmUnblock(row)} className="text-red-400 h-6">
                        Unblock
                    </Button>
                )
            )
        }
    ];

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
            <PageHeader
                title="Abuse Enforcement"
                subtitle="Real-world abuse control and firewall rules"
                actions={
                    <Button variant="ghost" size="sm" onClick={fetchEvents}>
                        <RefreshCw className="h-4 w-4 mr-1" /> Refresh
                    </Button>
                }
            />

            {error && <ErrorBanner message={error} onRetry={fetchEvents} />}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="bg-zinc-900 border-zinc-800 lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShieldAlert className="h-5 w-5 text-red-500" />
                            Manual Block
                        </CardTitle>
                        <CardDescription>Immediately block an entity</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs text-zinc-400">Entity Type</label>
                            <Select value={newBlockType} onValueChange={setNewBlockType} disabled={readonly}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ip_hash">IP Hash</SelectItem>
                                    <SelectItem value="wallet">Wallet</SelectItem>
                                    <SelectItem value="node">Node ID</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs text-zinc-400">Entity ID</label>
                            <Input
                                value={newBlockId}
                                onChange={(e) => setNewBlockId(e.target.value)}
                                placeholder="Hash, Wallet, or Node ID"
                                disabled={readonly}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs text-zinc-400">Reason</label>
                            <Input
                                value={newBlockReason}
                                onChange={(e) => setNewBlockReason(e.target.value)}
                                placeholder="Reason for block"
                                disabled={readonly}
                            />
                        </div>
                        <Button
                            className="w-full"
                            variant="destructive"
                            onClick={handleBlock}
                            disabled={!newBlockId || blocking || readonly}
                        >
                            {blocking ? 'Blocking...' : 'Block Entity'}
                        </Button>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800 lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-emerald-500" />
                            Active Rules
                        </CardTitle>
                        <CardDescription>Recent enforcement decisions</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <DataTable
                            columns={columns}
                            data={events}
                            loading={loading}
                        />
                    </CardContent>
                </Card>
            </div>

            <ConfirmDialog
                open={!!confirmUnblock}
                title="Unblock Entity?"
                description={`Are you sure you want to unblock ${confirmUnblock?.entity_type} ${confirmUnblock?.entity_id}?`}
                variant="default"
                confirmLabel="Unblock"
                onConfirm={handleUnblock}
                onCancel={() => setConfirmUnblock(null)}
            />
        </div>
    );
}
