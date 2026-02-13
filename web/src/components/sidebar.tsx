"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NavItem } from '@/config/nav';
import { LayoutDashboard, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';

interface SidebarProps {
    items: NavItem[];
}

export function Sidebar({ items }: SidebarProps) {
    const pathname = usePathname();
    const { user, logout } = useAuth();

    if (!user) return null;

    return (
        <aside className="hidden md:flex flex-col w-64 border-r border-zinc-800 bg-zinc-900 shadow-xl h-full">
            <div className="p-6">
                <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-blue-500">
                    <LayoutDashboard className="h-6 w-6" />
                    <span>Satelink</span>
                </Link>
            </div>

            <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
                {items.map((item) => (
                    <Link
                        key={item.path}
                        href={item.path}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all group ${pathname.startsWith(item.path)
                                ? 'bg-blue-600/10 text-blue-400'
                                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                            }`}
                    >
                        <item.icon
                            className={`h-5 w-5 ${pathname.startsWith(item.path)
                                    ? 'text-blue-400'
                                    : 'text-zinc-500 group-hover:text-zinc-300'
                                }`}
                        />
                        <span className="font-medium">{item.label}</span>
                    </Link>
                ))}
            </nav>

            <div className="p-4 border-t border-zinc-800">
                <div className="flex items-center gap-3 p-2 rounded-lg bg-zinc-800/50 mb-4">
                    <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xs">
                        {user.wallet.slice(2, 4).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">
                            {user.wallet.slice(0, 6)}...{user.wallet.slice(-4)}
                        </p>
                        <Badge
                            variant="outline"
                            className="text-[10px] py-0 h-4 border-zinc-700 text-zinc-400 uppercase"
                        >
                            {user.role.replace('_', ' ')}
                        </Badge>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    className="w-full justify-start text-zinc-400 hover:text-red-400 hover:bg-red-400/10"
                    onClick={logout}
                >
                    <LogOut className="mr-3 h-5 w-5" />
                    <span>Logout</span>
                </Button>
            </div>
        </aside>
    );
}
