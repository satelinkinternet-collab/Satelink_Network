"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { toast } from 'sonner';

const ROLE_REDIRECTS: Record<string, string> = {
    admin_super: '/admin',
    admin_ops: '/admin',
    node_operator: '/node',
    builder: '/builder',
    distributor_lco: '/distributor',
    distributor_influencer: '/distributor',
    enterprise: '/enterprise',
};

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.post('/login', { email, password });
            if (res.data?.ok && res.data?.token) {
                localStorage.setItem('satelink_token', res.data.token);
                const role = res.data.user?.role ?? 'node_operator';
                toast.success('Logged in successfully');
                router.push(ROLE_REDIRECTS[role] ?? '/');
            } else {
                throw new Error(res.data?.error || 'Login failed');
            }
        } catch (error: any) {
            const msg = error.response?.data?.error || error.message || 'Login failed';
            toast.error(msg);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full p-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-white rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                        <div className="w-8 h-8 bg-black rounded-lg transform rotate-45"></div>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome to Satelink</h1>
                    <p className="text-white/50 text-sm">Sign in to your account to continue.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm text-white/60 mb-1">Email</label>
                        <input
                            id="email"
                            type="email"
                            required
                            autoComplete="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-white/40 transition-colors"
                            placeholder="you@example.com"
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm text-white/60 mb-1">Password</label>
                        <input
                            id="password"
                            type="password"
                            required
                            autoComplete="current-password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-white/40 transition-colors"
                            placeholder="••••••••••"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 rounded-xl bg-white text-black font-semibold hover:bg-white/90 transition-all disabled:opacity-50"
                    >
                        {loading ? 'Signing in…' : 'Sign In'}
                    </button>
                </form>

                <p className="text-center text-sm text-white/40 mt-6">
                    Don&apos;t have an account?{' '}
                    <Link href="/register" className="text-white/70 hover:text-white underline transition-colors">
                        Register
                    </Link>
                </p>
            </div>
        </div>
    );
}
