"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NavItem } from '@/config/nav';
import { LayoutDashboard, LogOut, ChevronRight, PieChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { motion } from 'framer-motion';

interface SidebarProps {
    items: NavItem[];
}

export function Sidebar({ items }: SidebarProps) {
    const pathname = usePathname();
    const { user, logout } = useAuth();

    if (!user) return null;

    // Group items by section
    const sections = items.reduce<Record<string, NavItem[]>>((acc, item) => {
        const section = item.section || 'GENERAL';
        if (!acc[section]) acc[section] = [];
        acc[section].push(item);
        return acc;
    }, {});

    return (
        <aside className="hidden md:flex flex-col w-72 bg-sidebar text-sidebar-foreground h-full z-20 shadow-2xl relative overflow-hidden">
            {/* Subtle Gradient Background Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />

            {/* Brand Header */}
            <div className="p-6 pb-2 relative z-10">
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform duration-300">
                        <LayoutDashboard className="h-5 w-5" />
                    </div>
                    <div>
                        <span className="text-xl font-bold tracking-tight text-white block">Satelink</span>
                        <span className="text-[10px] text-zinc-400 font-medium tracking-widest uppercase block">Control Room</span>
                    </div>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-4 space-y-1 relative z-10 overflow-y-auto">
                {Object.entries(sections).map(([section, sectionItems]) => (
                    <div key={section} className="mb-3">
                        <p className="px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 mt-3">
                            {section}
                        </p>
                        {sectionItems.map((item) => {
                            const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
                            return (
                                <Link
                                    key={item.path}
                                    href={item.path}
                                    className="block relative group"
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="active-pill"
                                            className="absolute inset-0 bg-blue-600/10 border-l-2 border-blue-500 rounded-r-lg"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                        />
                                    )}
                                    <div className={`
                                        flex items-center justify-between px-4 py-2 transition-all duration-200 rounded-r-lg
                                        ${isActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5'}
                                    `}>
                                        <div className="flex items-center gap-3">
                                            <item.icon className={`h-4 w-4 ${isActive ? 'text-blue-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                                            <span className="font-medium text-[13px]">{item.label}</span>
                                        </div>
                                        {isActive && <ChevronRight className="h-3 w-3 text-blue-500" />}
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                ))}

                <div className="mt-4 px-4">
                    <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-xl p-4 border border-zinc-700/50 shadow-inner">
                        <div className="flex items-center gap-2 mb-2 text-zinc-400">
                            <PieChart className="h-4 w-4" />
                            <span className="text-xs font-semibold uppercase tracking-wider">Network Health</span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-700 rounded-full overflow-hidden mb-1">
                            <div className="h-full bg-emerald-500 w-[98%] shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                        </div>
                        <div className="flex justify-between text-[10px] text-zinc-500">
                            <span>Upload: 1.2TB</span>
                            <span className="text-emerald-400">99.9%</span>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Profile Footer */}
            <div className="p-4 border-t border-white/5 bg-black/20 relative z-10">
                <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center text-sm font-bold text-zinc-300">
                        {user.wallet.slice(2, 4).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-zinc-200 truncate font-mono">
                            {user.wallet.slice(0, 6)}...{user.wallet.slice(-4)}
                        </p>
                        <Badge variant="outline" className="text-[10px] py-0 h-4 border-zinc-600 text-zinc-400 uppercase bg-transparent">
                            {user.role.replace('_', ' ')}
                        </Badge>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    className="w-full justify-start text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg h-9"
                    onClick={logout}
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">Sign Out</span>
                </Button>
            </div>
        </aside>
    );
}
