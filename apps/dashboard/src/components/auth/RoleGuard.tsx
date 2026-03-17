"use client";

import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Loader2 } from 'lucide-react';

interface RoleGuardProps {
    /** Roles that are allowed to access this section */
    allowedRoles: string[];
    children: React.ReactNode;
}

/**
 * Client-side role guard component.
 * Wraps dashboard sections to enforce role-based access.
 *
 * If user is not authenticated → redirect to /login
 * If user role is not in allowedRoles → show 403
 */
export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
    const { user, loading } = useAuth();
    const router = useRouter();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
            </div>
        );
    }

    if (!user) {
        // Redirect happens via AppShell + middleware, but just in case:
        router.push('/login');
        return null;
    }

    if (!allowedRoles.includes(user.role)) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
                    <ShieldAlert className="w-8 h-8 text-red-400" />
                </div>
                <h1 className="text-2xl font-bold text-zinc-100 mb-2">Access Denied</h1>
                <p className="text-sm text-zinc-500 max-w-md">
                    Your role <span className="font-mono text-zinc-300">({user.role})</span> does not have
                    permission to access this section.
                </p>
                <button
                    onClick={() => router.back()}
                    className="mt-6 px-6 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm hover:bg-zinc-700 transition-colors"
                >
                    Go Back
                </button>
            </div>
        );
    }

    return <>{children}</>;
}
