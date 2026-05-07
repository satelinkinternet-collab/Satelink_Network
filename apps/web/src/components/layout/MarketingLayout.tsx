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
        <nav className="fixed top-0 left-0 right-0 z-50 bg-[#272829]/95 backdrop-blur-md border-b border-[#61677A]/40">
            <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#FFF6E0] flex items-center justify-center">
                        <span className="text-[#272829] text-xs font-bold">S</span>
                    </div>
                    <span className="font-bold tracking-tight text-[#FFF6E0] text-lg">SATELINK</span>
                </Link>

                <div className="hidden md:flex items-center gap-6">
                    {links.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="text-sm font-medium text-[#D8D9DA] hover:text-[#FFF6E0] transition-colors"
                        >
                            {link.label}
                        </Link>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    <Link
                        href="/login"
                        className="hidden md:inline-flex items-center gap-1 px-4 py-2 bg-[#FFF6E0] hover:bg-[#FFF6E0]/90 text-[#272829] text-sm font-medium rounded-lg transition-colors"
                    >
                        Launch App <ArrowRight className="w-4 h-4" />
                    </Link>
                    <button className="md:hidden text-[#D8D9DA]" onClick={() => setIsOpen(!isOpen)}>
                        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {isOpen && (
                <div className="md:hidden bg-[#272829]/98 border-t border-[#61677A]/40 px-6 py-4 space-y-2">
                    {links.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setIsOpen(false)}
                            className="block text-sm font-medium text-[#D8D9DA] hover:text-[#FFF6E0] py-2"
                        >
                            {link.label}
                        </Link>
                    ))}
                    <Link
                        href="/login"
                        onClick={() => setIsOpen(false)}
                        className="block text-sm font-medium text-[#FFF6E0] py-2"
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
        <footer className="bg-[#1E1F20] border-t border-[#61677A]/40 py-12 md:py-20">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                    <div>
                        <h3 className="font-bold text-[#FFF6E0] mb-4 text-sm">Product</h3>
                        <ul className="space-y-2 text-sm text-[#61677A]">
                            <li><Link href="/download" className="hover:text-[#D8D9DA] transition-colors">Download Node</Link></li>
                            <li><Link href="/developers" className="hover:text-[#D8D9DA] transition-colors">API Docs</Link></li>
                            <li><Link href="/network" className="hover:text-[#D8D9DA] transition-colors">Network Status</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-bold text-[#FFF6E0] mb-4 text-sm">Company</h3>
                        <ul className="space-y-2 text-sm text-[#61677A]">
                            <li><Link href="/about" className="hover:text-[#D8D9DA] transition-colors">About</Link></li>
                            <li><Link href="/enterprise" className="hover:text-[#D8D9DA] transition-colors">Enterprise</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-bold text-[#FFF6E0] mb-4 text-sm">Legal</h3>
                        <ul className="space-y-2 text-sm text-[#61677A]">
                            <li><Link href="/terms" className="hover:text-[#D8D9DA] transition-colors">Terms</Link></li>
                            <li><Link href="/privacy" className="hover:text-[#D8D9DA] transition-colors">Privacy</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-bold text-[#FFF6E0] mb-4 text-sm">Community</h3>
                        <ul className="space-y-2 text-sm text-[#61677A]">
                            <li><a href="#" className="hover:text-[#D8D9DA] transition-colors">Twitter / X</a></li>
                            <li><a href="#" className="hover:text-[#D8D9DA] transition-colors">Discord</a></li>
                            <li><a href="#" className="hover:text-[#D8D9DA] transition-colors">GitHub</a></li>
                        </ul>
                    </div>
                </div>
                <div className="border-t border-[#61677A]/40 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-[#61677A] text-sm">&copy; 2026 Satelink Network. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}

export function MarketingLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-[#272829] text-[#D8D9DA]">
            <MarketingNav />
            <main>{children}</main>
            <MarketingFooter />
        </div>
    );
}
