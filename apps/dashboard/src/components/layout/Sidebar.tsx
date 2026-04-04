"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Server, Activity, PieChart, Shield } from "lucide-react";

export function Sidebar() {
    const pathname = usePathname();

    const links = [
        { href: "/run-node/dashboard", label: "Node Earnings", icon: Server },
        { href: "/economics", label: "Economics", icon: PieChart },
        { href: "/network", label: "Network Stats", icon: Activity },
    ];

    return (
        <aside className="w-64 bg-[#0A0A0A] border-r border-[#262626] hidden md:flex flex-col h-full shrink-0">
            <div className="p-4 pt-6 text-xs font-bold text-zinc-500 uppercase tracking-widest">
                Main Menu
            </div>
            <nav className="flex-1 px-3 space-y-2">
                {links.map((link) => {
                    const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
                    const Icon = link.icon;
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`flex items-center gap-3 px-3 py-3 rounded-2xl transition-colors font-medium text-sm
                                ${isActive ? "bg-[#1A1A0A] text-[#3B82F6] border border-[#262626]" : "text-zinc-400 hover:text-zinc-200 hover:bg-[#1A1A0A] border border-transparent"}`}
                        >
                            <Icon className="h-5 w-5" />
                            {link.label}
                        </Link>
                    );
                })}
            </nav>
            <div className="p-4 border-t border-[#262626]">
                <div className="rounded-2xl border border-[#262626] bg-[#1A1A0A] p-4 text-center">
                    <Shield className="h-6 w-6 text-[#22C55E] mx-auto mb-2" />
                    <div className="text-zinc-200 font-medium text-sm">Secure Terminal</div>
                    <p className="text-xs text-zinc-500 mt-1">Satelink Encrypted</p>
                </div>
            </div>
        </aside>
    );
}
