"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NavItem } from '@/config/nav';
import { Menu, X, LogOut, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { motion, AnimatePresence } from 'framer-motion';

interface MobileNavProps {
    items: NavItem[];
}

export function MobileNav({ items }: MobileNavProps) {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);

    if (!user) return null;

    // We show up to 4 items in the bottom bar, and a generic "Menu" if more
    // For MVP, we'll show ALL items in bottom bar if <= 4, else show first 3 + Menu
    // Actually, "Menu" is always good to access Profile/Logout
    const primaryItems = items.slice(0, 4);

    return (
        <>
            {/* Bottom Tab Bar */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-zinc-900 border-t border-zinc-800 flex items-center justify-around z-50 px-2 pb-safe">
                {primaryItems.map((item) => (
                    <Link
                        key={item.path}
                        href={item.path}
                        className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${pathname.startsWith(item.path)
                                ? 'text-blue-500'
                                : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                        onClick={() => setIsOpen(false)}
                    >
                        <item.icon className="h-5 w-5" />
                        <span className="text-[10px] font-medium truncate w-16 text-center">{item.label}</span>
                    </Link>
                ))}

                <button
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isOpen ? 'text-blue-500' : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                    onClick={() => setIsOpen(true)}
                >
                    <Menu className="h-5 w-5" />
                    <span className="text-[10px] font-medium">Menu</span>
                </button>
            </div>

            {/* Slide-over Menu Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 z-50 md:hidden backdrop-blur-sm"
                            onClick={() => setIsOpen(false)}
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                            className="fixed top-0 right-0 bottom-0 w-[280px] bg-zinc-900 border-l border-zinc-800 z-50 md:hidden flex flex-col shadow-2xl"
                        >
                            <div className="p-5 flex items-center justify-between border-b border-zinc-800">
                                <span className="font-bold text-lg text-zinc-100">Menu</span>
                                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                                {/* Profile Section */}
                                <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-800">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm">
                                            {user.wallet.slice(2, 4).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-zinc-100 truncate">
                                                {user.wallet.slice(0, 6)}...{user.wallet.slice(-4)}
                                            </p>
                                            <Badge variant="outline" className="text-[10px] border-zinc-600 text-zinc-400 capitalize">
                                                {user.role.replace('_', ' ')}
                                            </Badge>
                                        </div>
                                    </div>
                                    <Button
                                        variant="destructive"
                                        className="w-full text-xs h-8"
                                        onClick={logout}
                                    >
                                        <LogOut className="mr-2 h-3 w-3" />
                                        Log Out
                                    </Button>
                                </div>

                                {/* Full Navigation List */}
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 px-2">Navigation</p>
                                    {items.map((item) => (
                                        <Link
                                            key={item.path}
                                            href={item.path}
                                            className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${pathname.startsWith(item.path)
                                                    ? 'bg-blue-600/10 text-blue-400'
                                                    : 'text-zinc-400 hover:text-zinc-100'
                                                }`}
                                            onClick={() => setIsOpen(false)}
                                        >
                                            <item.icon className="h-5 w-5" />
                                            <span className="font-medium">{item.label}</span>
                                        </Link>
                                    ))}
                                </div>
                            </div>

                            <div className="p-4 border-t border-zinc-800 text-center">
                                <p className="text-[10px] text-zinc-600">Satelink v0.9.0 (Beta)</p>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
