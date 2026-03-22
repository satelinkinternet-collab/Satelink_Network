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
        <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-zinc-800/60">
            <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">S</span>
                    </div>
                    <span className="font-bold tracking-tight text-white text-lg">SATELINK</span>
                </Link>

                <div className="hidden md:flex items-center gap-6">
                    {links.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                        >
                            {link.label}
                        </Link>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    <Link
                        href="/login"
                        className="hidden md:inline-flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        Launch App <ArrowRight className="w-4 h-4" />
                    </Link>
                    <button className="md:hidden text-zinc-300" onClick={() => setIsOpen(!isOpen)}>
                        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {isOpen && (
                <div className="md:hidden bg-black/95 border-t border-zinc-800 px-6 py-4 space-y-2">
                    {links.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setIsOpen(false)}
                            className="block text-sm font-medium text-zinc-400 hover:text-white py-2"
                        >
                            {link.label}
                        </Link>
                    ))}
                    <Link
                        href="/login"
                        onClick={() => setIsOpen(false)}
                        className="block text-sm font-medium text-blue-400 py-2"
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
        <footer className="bg-black border-t border-zinc-800 py-12 md:py-20">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                    <div>
                        <h3 className="font-bold text-white mb-4 text-sm">Product</h3>
                        <ul className="space-y-2 text-sm text-zinc-500">
                            <li><Link href="/download" className="hover:text-white transition-colors">Download Node</Link></li>
                            <li><Link href="/developers" className="hover:text-white transition-colors">API Docs</Link></li>
                            <li><Link href="/network" className="hover:text-white transition-colors">Network Status</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-bold text-white mb-4 text-sm">Company</h3>
                        <ul className="space-y-2 text-sm text-zinc-500">
                            <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
                            <li><Link href="/enterprise" className="hover:text-white transition-colors">Enterprise</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-bold text-white mb-4 text-sm">Legal</h3>
                        <ul className="space-y-2 text-sm text-zinc-500">
                            <li><Link href="/terms" className="hover:text-white transition-colors">Terms</Link></li>
                            <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-bold text-white mb-4 text-sm">Community</h3>
                        <ul className="space-y-2 text-sm text-zinc-500">
                            <li><a href="#" className="hover:text-white transition-colors">Twitter / X</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Discord</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">GitHub</a></li>
                        </ul>
                    </div>
                </div>
                <div className="border-t border-zinc-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-zinc-600 text-sm">&copy; 2026 Satelink Network. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}

export function MarketingLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-black text-white">
            <MarketingNav />
            <main>{children}</main>
            <MarketingFooter />
        </div>
    );
}
