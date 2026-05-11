"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowRight } from "lucide-react";
import { CTAButton } from "../ui/CTAButton";

const LINKS = [
    { href: "/about", label: "About" },
    { href: "/how-it-works", label: "How It Works" },
    { href: "/run-node", label: "Run Nodes" },
    { href: "/developers", label: "Developers" },
    { href: "/economics", label: "Economics" },
    { href: "/network", label: "Network" },
];

export function MarketingLayout({ children }: { children: React.ReactNode }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    useEffect(() => {
        setMobileMenuOpen(false);
    }, [pathname]);

    return (
        <div className="min-h-screen flex flex-col bg-[#091413] text-[#B0E4CC] selection:bg-[#00D1FF]/30 font-sans">
            <header
                className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 border-b border-transparent ${scrolled ? "bg-[#091413]/95 backdrop-blur-md border-[#285A48]/40" : "bg-transparent"
                    }`}
            >
                <div className="container mx-auto px-6 h-20 flex items-center justify-between max-w-7xl">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 rounded-lg bg-[#408A71] flex items-center justify-center text-[#091413] font-bold text-xl transition-transform group-hover:scale-105">
                            S
                        </div>
                        <span className="font-bold text-xl tracking-tight text-[#B0E4CC]">Satelink</span>
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

                    <nav className="hidden lg:flex items-center gap-8">
                        {LINKS.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`text-sm font-medium transition-colors hover:text-[#00D1FF] ${pathname === link.href ? "text-[#00D1FF]" : "text-[#B0E4CC]"
                                    }`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="hidden lg:flex items-center gap-4">
                        <Link href="/login" className="text-sm font-medium text-[#B0E4CC] hover:text-[#00D1FF] transition-colors mr-2">
                            Sign In
                        </Link>
                        <CTAButton href="/run-node" variant="primary" className="h-10 px-5 text-sm">
                            Deploy <ArrowRight className="w-4 h-4 ml-1" />
                        </CTAButton>
                    </div>

                    <button
                        className="lg:hidden p-2 -mr-2 text-[#B0E4CC] hover:text-[#00D1FF]"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>

                {/* Mobile Nav */}
                {mobileMenuOpen && (
                    <div className="lg:hidden absolute top-20 left-0 w-full bg-[#091413] border-b border-[#285A48]/40 px-6 py-6 flex flex-col gap-6 shadow-2xl">
                        {LINKS.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`text-lg font-medium ${pathname === link.href ? "text-[#00D1FF]" : "text-[#B0E4CC]"}`}
                            >
                                {link.label}
                            </Link>
                        ))}
                        <hr className="border-[#285A48]/40" />
                        <Link href="/login" className="text-lg font-medium text-[#00D1FF]">
                            Sign In
                        </Link>
                        <CTAButton href="/run-node" variant="primary" className="justify-center w-full">
                            Deploy Now
                        </CTAButton>
                    </div>
                )}
            </header>

            <main className="flex-1 flex flex-col pt-20">
                {children}
            </main>

            <footer className="bg-[#0d1f1d] border-t border-[#285A48]/40 pt-20 pb-10">
                <div className="container mx-auto px-6 max-w-7xl">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10 mb-16">
                        <div className="col-span-2 lg:col-span-2 space-y-6">
                            <Link href="/" className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-[#408A71] flex items-center justify-center text-[#091413] font-bold text-xl">
                                    S
                                </div>
                                <span className="font-bold text-xl tracking-tight text-[#B0E4CC]">Satelink</span>
                            </Link>
                            <p className="text-[#408A71] max-w-sm">
                                Next-generation verifiable infrastructure for revenue-generating decentralized networks.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-semibold text-[#B0E4CC] mb-6">Protocol</h4>
                            <ul className="space-y-4">
                                <li><Link href="/about" className="text-[#408A71] hover:text-[#00D1FF] transition-colors text-sm">Vision</Link></li>
                                <li><Link href="/how-it-works" className="text-[#408A71] hover:text-[#00D1FF] transition-colors text-sm">Architecture</Link></li>
                                <li><Link href="/economics" className="text-[#408A71] hover:text-[#00D1FF] transition-colors text-sm">Economics</Link></li>
                                <li><Link href="/settlement" className="text-[#408A71] hover:text-[#00D1FF] transition-colors text-sm">Settlement</Link></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-semibold text-[#B0E4CC] mb-6">Build</h4>
                            <ul className="space-y-4">
                                <li><Link href="/run-node" className="text-[#408A71] hover:text-[#00D1FF] transition-colors text-sm">Run a Node</Link></li>
                                <li><Link href="/developers" className="text-[#408A71] hover:text-[#00D1FF] transition-colors text-sm">Developers</Link></li>
                                <li><Link href="/enterprise" className="text-[#408A71] hover:text-[#00D1FF] transition-colors text-sm">Enterprise</Link></li>
                                <li><Link href="/docs" className="text-[#408A71] hover:text-[#00D1FF] transition-colors text-sm">Documentation</Link></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-semibold text-[#B0E4CC] mb-6">Organization</h4>
                            <ul className="space-y-4">
                                <li><Link href="/governance" className="text-[#408A71] hover:text-[#00D1FF] transition-colors text-sm">Governance</Link></li>
                                <li><Link href="/investors" className="text-[#408A71] hover:text-[#00D1FF] transition-colors text-sm">Investors</Link></li>
                                <li><Link href="/legal" className="text-[#408A71] hover:text-[#00D1FF] transition-colors text-sm">Legal & Terms</Link></li>
                                <li><Link href="/network" className="text-[#408A71] hover:text-[#00D1FF] transition-colors text-sm">Network Stats</Link></li>
                            </ul>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-[#285A48]/40 text-sm text-[#408A71]">
                        <p>© {new Date().getFullYear()} Satelink Network. All rights reserved.</p>
                        <div className="flex gap-6 mt-4 md:mt-0">
                            <Link href="/legal" className="hover:text-[#00D1FF]">Privacy Policy</Link>
                            <Link href="/legal" className="hover:text-[#00D1FF]">Terms of Service</Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
