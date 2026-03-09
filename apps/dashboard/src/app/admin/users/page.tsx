"use client";

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Search, UserCog, Shield, MoreHorizontal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function AdminUsersPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [newRole, setNewRole] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/admin-api/users?search=${search}`);
            if (data.ok) {
                setUsers(data.users);
            }
        } catch (err) {
            toast.error('Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeout = setTimeout(fetchUsers, 300);
        return () => clearTimeout(timeout);
    }, [search]);

    const handleRoleUpdate = async () => {
        if (!selectedUser || !newRole) return;
        try {
            const { data } = await api.post('/admin-api/users/role', {
                wallet: selectedUser.wallet,
                role: newRole
            });

            if (data.ok) {
                toast.success('Role updated successfully');
                setIsDialogOpen(false);
                fetchUsers();
            } else {
                toast.error(data.error || 'Failed to update role');
            }
        } catch (err) {
            toast.error('Failed to update role');
        }
    };

    const roles = ['user', 'admin_super', 'admin_ops', 'node_operator', 'builder', 'distributor_lco', 'distributor_influencer', 'enterprise'];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
                    <p className="text-zinc-400">View users and manage access roles.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchUsers}>Refresh</Button>
                </div>
            </div>

            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2 bg-zinc-800/50 p-2 rounded-md border border-zinc-700 w-full md:w-96">
                        <Search className="h-4 w-4 text-zinc-400" />
                        <Input
                            placeholder="Search by wallet..."
                            className="border-0 bg-transparent focus-visible:ring-0 h-auto p-0 text-zinc-100 placeholder:text-zinc-500"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader className="border-zinc-800">
                            <TableRow className="hover:bg-transparent border-zinc-800">
                                <TableHead>Wallet</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Joined</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-zinc-500">Loading...</TableCell>
                                </TableRow>
                            ) : users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12 text-zinc-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <p>No users found.</p>
                                            {process.env.NODE_ENV !== 'production' && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={async () => {
                                                        try {
                                                            await api.post('/__test/seed/admin');
                                                            toast.success("Seeded demo users");
                                                            fetchUsers();
                                                        } catch (e) { toast.error("Seeding failed"); }
                                                    }}
                                                >
                                                    Seed Demo Users
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                users.map((user) => (
                                    <TableRow key={user.wallet} className="border-zinc-800 hover:bg-zinc-800/50">
                                        <TableCell className="font-mono text-zinc-300">
                                            {user.wallet.slice(0, 6)}...{user.wallet.slice(-4)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="bg-zinc-800 text-zinc-300 border-zinc-700">
                                                {user.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className={`h-2 w-2 rounded-full ${user.last_seen > (Date.now() / 1000 - 3600) ? 'bg-green-500' : 'bg-zinc-600'}`} />
                                                <span className="text-xs text-zinc-400">
                                                    {user.last_seen ? formatDistanceToNow(user.last_seen * 1000, { addSuffix: true }) : 'Never'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-zinc-400 text-xs">
                                            {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Dialog open={isDialogOpen && selectedUser?.wallet === user.wallet} onOpenChange={(open) => {
                                                setIsDialogOpen(open);
                                                if (!open) setSelectedUser(null);
                                            }}>
                                                <DialogTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedUser(user);
                                                            setNewRole(user.role);
                                                        }}
                                                    >
                                                        <UserCog className="h-4 w-4 text-zinc-400" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="bg-zinc-900 border-zinc-800">
                                                    <DialogHeader>
                                                        <DialogTitle>Edit User Role</DialogTitle>
                                                    </DialogHeader>
                                                    <div className="space-y-4 py-4">
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-medium text-zinc-400">Wallet</label>
                                                            <div className="font-mono text-sm bg-zinc-950 p-2 rounded border border-zinc-800">
                                                                {user.wallet}
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-medium text-zinc-400">Role</label>
                                                            <select
                                                                className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-zinc-200"
                                                                value={newRole}
                                                                onChange={(e) => setNewRole(e.target.value)}
                                                            >
                                                                {roles.map(r => (
                                                                    <option key={r} value={r}>{r}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <DialogFooter>
                                                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                                        <Button onClick={handleRoleUpdate} className="bg-blue-600 hover:bg-blue-700">Save Changes</Button>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
