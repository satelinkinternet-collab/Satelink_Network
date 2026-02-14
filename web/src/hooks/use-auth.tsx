"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface User {
    wallet: string;
    role: string;
    permissions: string[];
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (token: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const fetchMe = async () => {
        try {
            const token = localStorage.getItem('satelink_token');
            if (!token) {
                setLoading(false);
                return null;
            }

            // Ensure we don't send without token, though interceptor handles it
            const { data } = await api.get('/auth/me');
            if (data.ok) {
                setUser(data.user);
                return data.user;
            }
        } catch (err) {
            console.error('Failed to fetch user', err);
            setUser(null);
            // If 401, interceptor redirects, but we should also clear state
            if (localStorage.getItem('satelink_token')) {
                // Maybe token expired
            }
        } finally {
            setLoading(false);
        }
        return null;
    };

    useEffect(() => {
        const token = localStorage.getItem('satelink_token');
        if (token) {
            fetchMe();
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (token: string) => {
        localStorage.setItem('satelink_token', token);
        const user = await fetchMe();

        if (user) {
            if (['admin_super', 'admin_ops'].includes(user.role)) router.push('/admin');
            else if (user.role === 'node_operator') router.push('/node');
            else if (user.role === 'builder') router.push('/builder');
            else if (user.role.startsWith('distributor')) router.push('/distributor');
            else if (user.role === 'enterprise') router.push('/enterprise');
            else router.push('/'); // Fallback
        } else {
            router.push('/');
        }
    };

    const logout = () => {
        localStorage.removeItem('satelink_token');
        setUser(null);
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
