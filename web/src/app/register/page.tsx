"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { toast } from 'sonner';

export default function RegisterPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 10) {
            toast.error('Password must be at least 10 characters');
            return;
        }
        setLoading(true);
        try {
            const res = await api.post('/register', { email, password, username });
            if (res.data?.ok && res.data?.token) {
                localStorage.setItem('satelink_token', res.data.token);
                toast.success('Account created successfully');
                router.push('/node');
            } else {
                throw new Error(res.data?.error || 'Registration failed');
            }
        } catch (error: any) {
            const msg = error.response?.data?.error || error.message || 'Registration failed';
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
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Create Account</h1>
                    <p className="text-white/50 text-sm">Join the Satelink network as a node operator.</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                        <label htmlFor="username" className="block text-sm text-white/60 mb-1">Username</label>
                        <input
                            id="username"
                            type="text"
                            autoComplete="username"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-white/40 transition-colors"
                            placeholder="satoshi"
                        />
                    </div>
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
                        <label htmlFor="password" className="block text-sm text-white/60 mb-1">Password <span className="text-white/30">(min 10 characters)</span></label>
                        <input
                            id="password"
                            type="password"
                            required
                            autoComplete="new-password"
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
                        {loading ? 'Creating account…' : 'Create Account'}
                    </button>
                </form>

                <p className="text-center text-sm text-white/40 mt-6">
                    Already have an account?{' '}
                    <Link href="/login" className="text-white/70 hover:text-white underline transition-colors">
                        Sign In
                    </Link>
                </p>
            </div>
        </div>
    );
}
