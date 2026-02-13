"use client";

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Loader2, Wallet } from 'lucide-react';

export default function LoginPage() {
    const [wallet, setWallet] = useState('');
    const [role, setRole] = useState('builder');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const searchParams = useSearchParams();
    const refCode = searchParams.get('ref');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!wallet) {
            toast.error('Wallet address is required');
            return;
        }

        setLoading(true);
        try {
            // Updated Path: /__test/auth/login (proxied via Next.js rewrites or direct if API base is set)
            // Assuming API base is set or proxy handles /__test
            // web/src/lib/api.ts logic handles base URL. 
            // If dev server runs on 3000 and express on 8080/3001, we need full path if no proxy.
            // But usually api.post handles it. 
            // The path in dev_auth_tokens.js is mounted at /__test/auth
            // The router has .post('/login')
            // So full path is /__test/auth/login
            const { data } = await api.post('/__test/auth/login', { wallet, role, refCode });
            if (data.success) {
                toast.success(`Logged in as ${role}`);
                await login(data.token);
            } else {
                toast.error(data.error || 'Login failed');
            }
        } catch (err: any) {
            console.error(err);
            toast.error('Network error or server unavailable');
        } finally {
            setLoading(false);
        }
    };

    const roles = [
        { value: 'admin_super', label: 'Super Admin' },
        { value: 'admin_ops', label: 'Ops Admin' },
        { value: 'node_operator', label: 'Node Operator' },
        { value: 'builder', label: 'Builder' },
        { value: 'distributor_lco', label: 'Distributor (LCO)' },
        { value: 'distributor_influencer', label: 'Distributor (Influencer)' },
        { value: 'enterprise', label: 'Enterprise' },
    ];

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
            <Card className="w-full max-w-md border-zinc-800 bg-zinc-900 text-zinc-100">
                <CardHeader className="space-y-1">
                    <div className="flex items-center justify-center mb-4">
                        <div className="p-3 rounded-full bg-blue-600/10 text-blue-500">
                            <Wallet className="h-8 w-8" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl text-center font-bold">Satelink MVP</CardTitle>
                    <CardDescription className="text-center text-zinc-400">
                        Enter your wallet address to access the dashboard.
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleLogin}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300">Wallet Address</label>
                            <Input
                                placeholder="0x..."
                                value={wallet}
                                onChange={(e) => setWallet(e.target.value)}
                                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300">Role (Dev Only)</label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {roles.map((r) => (
                                    <option key={r.value} value={r.value}>
                                        {r.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-all font-semibold py-6">
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Sign In'}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
            <div className="absolute bottom-4 text-xs text-zinc-500">
                Beta Mode • Satelink Network v0.1.0
            </div>
        </div>
    );
}
