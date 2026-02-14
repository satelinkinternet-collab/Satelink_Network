"use client";

import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter, usePathname } from 'next/navigation';
import { canAccess, Role } from '@/lib/permissions';
import { Activity, LayoutDashboard, Loader2 } from 'lucide-react';
import { NAV_ITEMS } from '@/config/nav';
import { Sidebar } from '@/components/sidebar';
import { MobileNav } from '@/components/mobile-nav';
import { Notifications } from '@/components/notifications';

export function LayoutShell({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const publicPaths = ['/login', '/', '/health-ui', '/about', '/download', '/terms', '/privacy'];
        if (!loading && !user && !publicPaths.includes(pathname) && !pathname.startsWith('/preview')) {
            router.push('/login');
        }
        if (!loading && user && !canAccess(user.role as Role, pathname)) {
            router.push('/403');
        }
    }, [user, loading, pathname, router]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-zinc-950 text-white">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (['/login', '/403', '/', '/health-ui', '/about', '/download', '/terms', '/privacy'].includes(pathname) || pathname.startsWith('/preview')) {
        return <>{children}</>;
    }

    if (!user) return null;

    const filteredItems = NAV_ITEMS.filter(item => item.roles.includes(user.role as Role));
    const currentLabel = filteredItems.find(i => pathname.startsWith(i.path))?.label || 'Dashboard';

    return (
        <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans selection:bg-blue-500/20">
            {/* Desktop Sidebar */}
            <Sidebar items={filteredItems} />

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <header className="h-14 border-b border-zinc-800/60 bg-zinc-900/80 backdrop-blur-sm flex items-center justify-between px-4 md:px-6 z-10">
                    <div className="flex items-center gap-4">
                        <div className="md:hidden flex items-center gap-2 text-blue-400 mr-2">
                            <LayoutDashboard className="h-5 w-5" />
                        </div>
                        <h1 className="font-semibold text-base truncate text-zinc-200">
                            {currentLabel}
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="hidden md:inline">Network: Live</span>
                            <span className="md:hidden">Live</span>
                        </div>

                        <div className="h-5 w-px bg-zinc-800 mx-1" />
                        <Notifications />
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto pb-24 md:pb-6 relative scroll-smooth bg-zinc-950 scrollbar-thin">
                    {/* Beta Banner */}
                    <div className="mx-4 md:mx-6 mt-4 mb-2 flex items-center gap-3 p-3 rounded-xl border border-blue-500/20 bg-blue-500/5 text-blue-400 text-xs md:text-sm">
                        <LayoutDashboard className="h-4 w-4 shrink-0" />
                        <p><span className="font-bold">Beta MVP</span>: Live data may be delayed. Withdrawal circuits are active.</p>
                    </div>

                    {children}
                </main>
            </div>

            {/* Mobile Navigation */}
            <MobileNav items={filteredItems} />
        </div>
    );
}
