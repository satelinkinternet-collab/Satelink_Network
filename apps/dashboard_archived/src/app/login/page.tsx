"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { toast } from 'sonner';

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleLogin = async (role: string, wallet: string, redirect: string) => {
        setLoading(true);
        try {
            const res = await api.post('/__test/auth/login', { wallet, role });
            if (res.data?.token) {
                localStorage.setItem('satelink_token', res.data.token);
                toast.success(`Logged in as ${role}`);
                router.push(redirect);
            } else {
                throw new Error('No token received');
            }
        } catch (error: any) {
            console.error('Login failed:', error);
            toast.error(error.message || 'Login failed');
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
                    <p className="text-white/50 text-sm">Select a diagnostic role to continue.</p>
                </div>

                <div className="space-y-4">
                    <button
                        onClick={() => handleLogin('admin_super', '0xadmin_super', '/admin')}
                        disabled={loading}
                        className="w-full py-3 rounded-xl bg-white text-black font-semibold hover:bg-white/90 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                    >
                        Login as Super Admin
                    </button>
                    <button
                        onClick={() => handleLogin('node_operator', '0xnode_op_1', '/node')}
                        disabled={loading}
                        className="w-full py-3 rounded-xl border border-white/20 hover:bg-white/5 transition-all text-sm font-medium text-white/90"
                    >
                        Login as Node Operator
                    </button>
                    <button
                        onClick={() => handleLogin('builder', '0xbuilder_1', '/builder')}
                        disabled={loading}
                        className="w-full py-3 rounded-xl border border-white/20 hover:bg-white/5 transition-all text-sm font-medium text-white/90"
                    >
                        Login as Builder
                    </button>
                    <button
                        onClick={() => handleLogin('distributor_lco', '0xdist_1', '/distributor')}
                        disabled={loading}
                        className="w-full py-3 rounded-xl border border-white/20 hover:bg-white/5 transition-all text-sm font-medium text-white/90"
                    >
                        Login as Distributor
                    </button>
                    <button
                        onClick={() => handleLogin('enterprise', '0xent_1', '/enterprise')}
                        disabled={loading}
                        className="w-full py-3 rounded-xl border border-white/20 hover:bg-white/5 transition-all text-sm font-medium text-white/90"
                    >
                        Login as Enterprise
                    </button>
                </div>
            </div>
        </div>
    );
}
