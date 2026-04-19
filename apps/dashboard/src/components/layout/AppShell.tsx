"use client";

import React, { useEffect } from "react";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // In the scope of this implementation, /run-node/dashboard requires auth
        const isAuthRequired = pathname.startsWith('/run-node/dashboard');

        if (!loading && !user && isAuthRequired) {
            router.push('/login');
        }
    }, [user, loading, pathname, router]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#0A0A0A] text-white flex-col gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-[#3B82F6]" />
                <div className="text-zinc-400 font-mono text-sm tracking-widest uppercase animate-pulse">Initializing Terminal...</div>
            </div>
        );
    }

    // Hide AppShell frame for login and error pages
    const isBarePage = pathname === '/login' || pathname === '/403';

    if (isBarePage) {
        return <>{children}</>;
    }

    return (
        <div className="flex flex-col h-screen bg-[#0A0A0A] text-zinc-100 overflow-hidden font-sans">
            <Navbar />
            <div className="flex flex-1 overflow-hidden relative">
                <Sidebar />
                <main className="flex-1 overflow-y-auto bg-[#0A0A0A] relative scroll-smooth scrollbar-thin p-4 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
