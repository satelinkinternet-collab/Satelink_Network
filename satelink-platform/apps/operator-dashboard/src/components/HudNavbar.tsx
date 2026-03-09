'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, ShieldAlert, Cpu } from 'lucide-react';
import { motion } from 'framer-motion';

export default function HudNavbar() {
    const pathname = usePathname();

    const links = [
        { name: 'PRODUCTS', href: '/products' },
        { name: 'DEVELOPERS', href: '/developers' },
        { name: 'NODE_OPS', href: '/node-operators' },
        { name: 'NETWORK_MAP', href: '/network' },
        { name: 'PRICING', href: '/pricing' },
    ];

    return (
        <nav className="fixed top-0 left-0 w-full z-50 bg-[#020617]/80 backdrop-blur-md border-b-2 border-[#0ea5e9]">
            {/* Top decorative tech bar */}
            <div className="h-1 w-full bg-gradient-to-r from-[#00d9ff] via-[#22d3ee] to-[#00d9ff] opacity-50"></div>

            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="relative flex items-center justify-center w-8 h-8 rounded-full border border-[#00d9ff] bg-[#06122e] panel-glow">
                        <Activity className="w-4 h-4 text-[#00d9ff]" />
                        <motion.div
                            className="absolute inset-0 rounded-full border border-[#22d3ee]"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                        />
                    </div>
                    <span className="font-['Orbitron'] font-bold text-lg text-white tracking-widest text-glow-cyan">
                        SATELINK
                    </span>
                </Link>

                {/* Desktop Links */}
                <div className="hidden md:flex items-center gap-8">
                    {links.map((link) => {
                        const isActive = pathname.startsWith(link.href);
                        return (
                            <Link
                                key={link.name}
                                href={link.href}
                                className={`font-mono text-[10px] tracking-[0.2em] transition-all relative ${isActive ? 'text-[#00d9ff] text-glow-cyan font-bold' : 'text-[#94a3b8] hover:text-white'
                                    }`}
                            >
                                {isActive && (
                                    <motion.span
                                        layoutId="nav-indicator"
                                        className="absolute -bottom-6 left-0 right-0 h-1 bg-[#00d9ff] glow-cyan"
                                    />
                                )}
                                [{link.name}]
                            </Link>
                        );
                    })}
                </div>

                {/* Action Buttons */}
                <div className="hidden md:flex items-center gap-4">
                    <Link href="/dashboard" className="flex items-center gap-2 px-3 py-1 border border-[#ff7a00] bg-[#ff7a00]/10 text-[#ff7a00] font-mono text-[10px] tracking-widest hover:bg-[#ff7a00]/20 transition-colors glow-orange">
                        <Cpu className="w-3 h-3" />
                        OPERATOR DASH
                    </Link>
                    <Link href="/docs" className="flex items-center gap-2 px-3 py-1 bg-[#0ea5e9]/20 border border-[#0ea5e9] text-[#22d3ee] font-mono text-[10px] tracking-widest hover:bg-[#0ea5e9]/40 transition-colors panel-glow">
                        <ShieldAlert className="w-3 h-3" />
                        INIT_SYS
                    </Link>
                </div>
            </div>
        </nav>
    );
}
