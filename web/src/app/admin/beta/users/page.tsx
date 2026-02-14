
"use client";
import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from 'sonner';

export default function BetaUsersPage() {
    const [users, setUsers] = useState<any[]>([]);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/proxy?path=/admin/beta/users');
            const data = await res.json();
            if (data.ok) setUsers(data.users);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    const toggleSuspend = async (id: number) => {
        try {
            const res = await fetch('/api/proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path: `/admin/beta/users/${id}/suspend`,
                    method: 'POST'
                })
            });
            const data = await res.json();
            if (data.ok) {
                toast.success('User status updated');
                fetchUsers();
            } else {
                toast.error(data.error);
            }
        } catch (e) {
            toast.error('Failed to update status');
        }
    };

    return (
        <div className="space-y-6 p-6">
            <h1 className="text-3xl font-bold tracking-tight text-white mb-6">Beta Users</h1>

            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-lg font-medium text-white">Active Users ({users.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="relative overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-400">
                            <thead className="text-xs uppercase bg-zinc-950 text-gray-400">
                                <tr>
                                    <th className="px-6 py-3">Wallet</th>
                                    <th className="px-6 py-3">Invite Code</th>
                                    <th className="px-6 py-3">Joined</th>
                                    <th className="px-6 py-3">Last Seen</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u) => (
                                    <tr key={u.id} className="border-b border-zinc-800">
                                        <td className="px-6 py-4 font-mono text-zinc-300">{u.wallet}</td>
                                        <td className="px-6 py-4 text-indigo-400">{u.invite_code}</td>
                                        <td className="px-6 py-4">{new Date(u.created_at).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">{new Date(u.last_seen_at).toLocaleTimeString()}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs ${u.status === 'active' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                                                {u.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => toggleSuspend(u.id)}
                                                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                                            >
                                                {u.status === 'active' ? 'Suspend' : 'Activate'}
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
