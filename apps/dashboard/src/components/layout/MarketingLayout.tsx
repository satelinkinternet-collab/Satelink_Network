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
        <div className="min-h-screen flex flex-col bg-[#272829] text-[#D8D9DA] selection:bg-[#FFF6E0]/30 font-sans">
            <header
                className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 border-b border-transparent ${scrolled ? "bg-[#272829]/95 backdrop-blur-md border-[#61677A]/40" : "bg-transparent"
                    }`}
            >
                <div className="container mx-auto px-6 h-20 flex items-center justify-between max-w-7xl">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 rounded-lg bg-[#FFF6E0] flex items-center justify-center text-[#272829] font-bold text-xl transition-transform group-hover:scale-105">
                            S
                        </div>
                        <span className="font-bold text-xl tracking-tight text-[#FFF6E0]">Satelink</span>
                    </Link>

                    <nav className="hidden lg:flex items-center gap-8">
                        {LINKS.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`text-sm font-medium transition-colors hover:text-[#FFF6E0] ${pathname === link.href ? "text-[#FFF6E0]" : "text-[#D8D9DA]"
                                    }`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="hidden lg:flex items-center gap-4">
                        <Link href="/login" className="text-sm font-medium text-[#D8D9DA] hover:text-[#FFF6E0] transition-colors mr-2">
                            Sign In
                        </Link>
                        <CTAButton href="/run-node" variant="primary" className="h-10 px-5 text-sm">
                            Deploy <ArrowRight className="w-4 h-4 ml-1" />
                        </CTAButton>
                    </div>

                    <button
                        className="lg:hidden p-2 -mr-2 text-[#D8D9DA] hover:text-[#FFF6E0]"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>

                {/* Mobile Nav */}
                {mobileMenuOpen && (
                    <div className="lg:hidden absolute top-20 left-0 w-full bg-[#272829] border-b border-[#61677A]/40 px-6 py-6 flex flex-col gap-6 shadow-2xl">
                        {LINKS.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`text-lg font-medium ${pathname === link.href ? "text-[#FFF6E0]" : "text-[#D8D9DA]"}`}
                            >
                                {link.label}
                            </Link>
                        ))}
                        <hr className="border-[#61677A]/40" />
                        <Link href="/login" className="text-lg font-medium text-[#FFF6E0]">
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

            <footer className="bg-[#1E1F20] border-t border-[#61677A]/40 pt-20 pb-10">
                <div className="container mx-auto px-6 max-w-7xl">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10 mb-16">
                        <div className="col-span-2 lg:col-span-2 space-y-6">
                            <Link href="/" className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-[#FFF6E0] flex items-center justify-center text-[#272829] font-bold text-xl">
                                    S
                                </div>
                                <span className="font-bold text-xl tracking-tight text-[#FFF6E0]">Satelink</span>
                            </Link>
                            <p className="text-[#61677A] max-w-sm">
                                Next-generation verifiable infrastructure for revenue-generating decentralized networks.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-semibold text-[#FFF6E0] mb-6">Protocol</h4>
                            <ul className="space-y-4">
                                <li><Link href="/about" className="text-[#61677A] hover:text-[#D8D9DA] transition-colors text-sm">Vision</Link></li>
                                <li><Link href="/how-it-works" className="text-[#61677A] hover:text-[#D8D9DA] transition-colors text-sm">Architecture</Link></li>
                                <li><Link href="/economics" className="text-[#61677A] hover:text-[#D8D9DA] transition-colors text-sm">Economics</Link></li>
                                <li><Link href="/settlement" className="text-[#61677A] hover:text-[#D8D9DA] transition-colors text-sm">Settlement</Link></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-semibold text-[#FFF6E0] mb-6">Build</h4>
                            <ul className="space-y-4">
                                <li><Link href="/run-node" className="text-[#61677A] hover:text-[#D8D9DA] transition-colors text-sm">Run a Node</Link></li>
                                <li><Link href="/developers" className="text-[#61677A] hover:text-[#D8D9DA] transition-colors text-sm">Developers</Link></li>
                                <li><Link href="/enterprise" className="text-[#61677A] hover:text-[#D8D9DA] transition-colors text-sm">Enterprise</Link></li>
                                <li><Link href="/docs" className="text-[#61677A] hover:text-[#D8D9DA] transition-colors text-sm">Documentation</Link></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-semibold text-[#FFF6E0] mb-6">Organization</h4>
                            <ul className="space-y-4">
                                <li><Link href="/governance" className="text-[#61677A] hover:text-[#D8D9DA] transition-colors text-sm">Governance</Link></li>
                                <li><Link href="/investors" className="text-[#61677A] hover:text-[#D8D9DA] transition-colors text-sm">Investors</Link></li>
                                <li><Link href="/legal" className="text-[#61677A] hover:text-[#D8D9DA] transition-colors text-sm">Legal & Terms</Link></li>
                                <li><Link href="/network" className="text-[#61677A] hover:text-[#D8D9DA] transition-colors text-sm">Network Stats</Link></li>
                            </ul>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-[#61677A]/40 text-sm text-[#61677A]">
                        <p>© {new Date().getFullYear()} Satelink Network. All rights reserved.</p>
                        <div className="flex gap-6 mt-4 md:mt-0">
                            <Link href="/legal" className="hover:text-[#D8D9DA]">Privacy Policy</Link>
                            <Link href="/legal" className="hover:text-[#D8D9DA]">Terms of Service</Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
