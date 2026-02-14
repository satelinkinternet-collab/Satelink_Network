
"use client";
import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from 'sonner';

export default function BetaInvitesPage() {
    const [invites, setInvites] = useState<any[]>([]);
    const [newInvite, setNewInvite] = useState({ code: '', max_uses: 100, expires_in_days: 30 });

    const fetchInvites = async () => {
        try {
            const res = await fetch('/api/proxy?path=/admin/beta/invites');
            const data = await res.json();
            if (data.ok) setInvites(data.invites);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => { fetchInvites(); }, []);

    const createInvite = async () => {
        try {
            const res = await fetch('/api/proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path: '/admin/beta/invites',
                    method: 'POST',
                    body: newInvite
                })
            });
            const data = await res.json();
            if (data.ok) {
                toast.success(`Invite created: ${data.invite_code}`);
                fetchInvites();
            } else {
                toast.error(data.error);
            }
        } catch (e) {
            toast.error('Failed to create invite');
        }
    };

    return (
        <div className="space-y-6 p-6">
            <h1 className="text-3xl font-bold tracking-tight text-white mb-6">Beta Invites</h1>

            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-lg font-medium text-white">Create New Invite</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-4">
                        <Input
                            placeholder="Custom Code (optional)"
                            value={newInvite.code}
                            onChange={e => setNewInvite({ ...newInvite, code: e.target.value })}
                            className="bg-zinc-950 border-zinc-800 text-white"
                        />
                        <Input
                            type="number"
                            placeholder="Max Uses"
                            value={newInvite.max_uses}
                            onChange={e => setNewInvite({ ...newInvite, max_uses: parseInt(e.target.value) })}
                            className="bg-zinc-950 border-zinc-800 text-white w-32"
                        />
                        <Input
                            type="number"
                            placeholder="Days"
                            value={newInvite.expires_in_days}
                            onChange={e => setNewInvite({ ...newInvite, expires_in_days: parseInt(e.target.value) })}
                            className="bg-zinc-950 border-zinc-800 text-white w-24"
                        />
                        <Button onClick={createInvite} className="bg-indigo-600 hover:bg-indigo-700">Create</Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-lg font-medium text-white">Active Invites</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-1">
                        {invites.map((inv) => (
                            <div key={inv.id} className="grid grid-cols-6 gap-4 py-3 border-b border-zinc-800 items-center text-sm">
                                <span className="font-mono text-indigo-400 font-bold col-span-1">{inv.invite_code}</span>
                                <span className="text-zinc-400 col-span-1">Used: {inv.used_count} / {inv.max_uses}</span>
                                <span className="text-zinc-500 col-span-1">By: {inv.created_by_wallet?.substring(0, 6)}...</span>
                                <span className="text-zinc-500 col-span-1">
                                    {inv.expires_at ? new Date(inv.expires_at).toLocaleDateString() : 'Never'}
                                </span>
                                <span className={inv.status === 'active' ? 'text-green-500' : 'text-red-500'}>
                                    {inv.status}
                                </span>
                                <Button size="sm" variant="ghost" className="text-zinc-400 hover:text-white" disabled>
                                    Copy
                                </Button>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
