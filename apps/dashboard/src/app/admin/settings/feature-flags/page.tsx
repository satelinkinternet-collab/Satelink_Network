"use client";

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Save, Edit2 } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader, ErrorBanner, ConfirmDialog, useIsReadonly, formatTs, LoadingSkeleton } from '@/components/admin/admin-shared';

export default function FeatureFlagsPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [flags, setFlags] = useState<any[]>([]);
    const [editing, setEditing] = useState<{ key: string; value: string } | null>(null);
    const [saving, setSaving] = useState(false);
    const readonly = useIsReadonly();

    const fetch = useCallback(async () => {
        try {
            setError('');
            const res = await api.get('/admin/settings/feature-flags');
            if (res.data.ok) setFlags(res.data.flags);
        } catch (e: any) {
            setError(e.response?.data?.error || 'Failed to fetch');
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetch(); }, [fetch]);

    const save = async () => {
        if (!editing) return;
        setSaving(true);
        try {
            await api.post('/admin/settings/feature-flags', editing);
            await fetch();
            setEditing(null);
        } catch (e: any) {
            setError(e.response?.data?.error || 'Save failed');
        } finally { setSaving(false); }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto">
            <PageHeader title="Feature Flags" subtitle="System-wide toggles and configuration flags"
                actions={<Button variant="ghost" size="sm" onClick={fetch} className="text-zinc-400 hover:text-zinc-200"><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>}
            />
            {error && <ErrorBanner message={error} onRetry={fetch} />}

            {loading ? <LoadingSkeleton rows={6} /> : (
                <Card className="bg-zinc-900/60 border-zinc-800/60">
                    <CardContent className="p-0 divide-y divide-zinc-800/40">
                        {flags.length === 0 && (
                            <div className="py-8 text-center text-zinc-500 text-sm">No flags configured</div>
                        )}
                        {flags.map((flag) => (
                            <div key={flag.key} className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-zinc-800/20 transition-colors">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-zinc-200 font-mono">{flag.key}</p>
                                    {flag.updated_by && (
                                        <p className="text-[10px] text-zinc-600 mt-0.5">
                                            Updated by {flag.updated_by?.slice(0, 10)}... · {formatTs(flag.updated_at)}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    {editing?.key === flag.key ? (
                                        <>
                                            <input
                                                value={editing?.value ?? ''}
                                                onChange={e => editing && setEditing({ ...editing, value: e.target.value })}
                                                className="px-3 py-1.5 text-sm rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 w-40 focus:outline-none focus:border-blue-500/50"
                                                autoFocus
                                            />
                                            <Button size="sm" onClick={save} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-3">
                                                <Save className="h-3 w-3 mr-1" /> Save
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => setEditing(null)} className="text-zinc-400 text-xs h-8 px-2">Cancel</Button>
                                        </>
                                    ) : (
                                        <>
                                            <Badge className={`font-mono text-xs ${flag.value === '1' || flag.value === 'true' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : flag.value === '0' || flag.value === 'false' ? 'bg-zinc-800 text-zinc-400 border-zinc-700' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                                {flag.value}
                                            </Badge>
                                            {!readonly && (
                                                <Button size="sm" variant="ghost" onClick={() => setEditing({ key: flag.key, value: flag.value })} className="text-zinc-500 hover:text-zinc-300 h-8 px-2">
                                                    <Edit2 className="h-3 w-3" />
                                                </Button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
