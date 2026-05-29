"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { useState } from "react";

function MarketingNav() {
    const [isOpen, setIsOpen] = useState(false);
    const links = [
        { href: "/", label: "Home" },
        { href: "/about", label: "About" },
        { href: "/enterprise", label: "Enterprise" },
        { href: "/developers", label: "Docs" },
        { href: "/download", label: "Download" },
    ];

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-[#091413]/95 backdrop-blur-md border-b border-[#285A48]/40">
            <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#408A71] flex items-center justify-center">
                        <span className="text-[#091413] text-xs font-bold">S</span>
                    </div>
                    <span className="font-bold tracking-tight text-[#B0E4CC] text-lg">SATELINK</span>
                    <span style={{
                        fontSize: '9px',
                        background: 'rgba(0,209,255,0.1)',
                        color: '#00D1FF',
                        border: '1px solid rgba(0,209,255,0.3)',
                        padding: '2px 6px',
                        borderRadius: '2px',
                        letterSpacing: '0.15em',
                        marginLeft: '8px',
                        textTransform: 'uppercase',
                        verticalAlign: 'middle'
                    }}>BETA</span>
                </Link>

                <div className="hidden md:flex items-center gap-6">
                    {links.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="text-sm font-medium text-[#B0E4CC] hover:text-[#00D1FF] transition-colors"
                        >
                            {link.label}
                        </Link>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    <Link
                        href="/login"
                        className="hidden md:inline-flex items-center gap-1 px-4 py-2 bg-[#408A71] hover:bg-[#285A48] text-[#091413] text-sm font-bold rounded-lg transition-all hover:shadow-[0_0_20px_rgba(0,209,255,0.3)]"
                    >
                        Launch App <ArrowRight className="w-4 h-4" />
                    </Link>
                    <button className="md:hidden text-[#B0E4CC]" onClick={() => setIsOpen(!isOpen)}>
                        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {isOpen && (
                <div className="md:hidden bg-[#091413]/98 border-t border-[#285A48]/40 px-6 py-4 space-y-2">
                    {links.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setIsOpen(false)}
                            className="block text-sm font-medium text-[#B0E4CC] hover:text-[#00D1FF] py-2"
                        >
                            {link.label}
                        </Link>
                    ))}
                    <Link
                        href="/login"
                        onClick={() => setIsOpen(false)}
                        className="block text-sm font-medium text-[#00D1FF] py-2"
                    >
                        Launch App
                    </Link>
                </div>
            )}
        </nav>
    );
}

function MarketingFooter() {
    return (
        <footer className="bg-[#0d1f1d] border-t border-[#285A48]/40 py-12 md:py-20">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                    <div>
                        <h3 className="font-bold text-[#B0E4CC] mb-4 text-sm">Product</h3>
                        <ul className="space-y-2 text-sm text-[#408A71]">
                            <li><Link href="/download" className="hover:text-[#00D1FF] transition-colors">Download Node</Link></li>
                            <li><Link href="/developers" className="hover:text-[#00D1FF] transition-colors">API Docs</Link></li>
                            <li><Link href="/network" className="hover:text-[#00D1FF] transition-colors">Network Status</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-bold text-[#B0E4CC] mb-4 text-sm">Company</h3>
                        <ul className="space-y-2 text-sm text-[#408A71]">
                            <li><Link href="/about" className="hover:text-[#00D1FF] transition-colors">About</Link></li>
                            <li><Link href="/enterprise" className="hover:text-[#00D1FF] transition-colors">Enterprise</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-bold text-[#B0E4CC] mb-4 text-sm">Legal</h3>
                        <ul className="space-y-2 text-sm text-[#408A71]">
                            <li><Link href="/terms" className="hover:text-[#00D1FF] transition-colors">Terms</Link></li>
                            <li><Link href="/privacy" className="hover:text-[#00D1FF] transition-colors">Privacy</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-bold text-[#B0E4CC] mb-4 text-sm">Community</h3>
                        <ul className="space-y-2 text-sm text-[#408A71]">
                            <li><a href="#" className="hover:text-[#00D1FF] transition-colors">Twitter / X</a></li>
                            <li><a href="#" className="hover:text-[#00D1FF] transition-colors">Discord</a></li>
                            <li><a href="#" className="hover:text-[#00D1FF] transition-colors">GitHub</a></li>
                        </ul>
                    </div>
                </div>
                <div className="border-t border-[#285A48]/40 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-[#408A71] text-sm">&copy; 2026 Satelink Network. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}

export function MarketingLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-[#091413] text-[#B0E4CC]">
            <MarketingNav />
            <main>{children}</main>
            <MarketingFooter />
        </div>
    );
}
