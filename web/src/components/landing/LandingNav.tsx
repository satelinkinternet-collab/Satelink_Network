"use client";

import Link from "next/link";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { ArrowRight, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function LandingNav() {
    const [isOpen, setIsOpen] = useState(false);
    const [hidden, setHidden] = useState(false);
    const { scrollY } = useScroll();

    useMotionValueEvent(scrollY, "change", (latest) => {
        const previous = scrollY.getPrevious() ?? 0;
        if (latest > previous && latest > 150) {
            setHidden(true);
        } else {
            setHidden(false);
        }
    });

    const links = [
        { href: "/", label: "Home" },
        { href: "/about", label: "Mission" },
        { href: "/download", label: "Download" },
    ];

    return (
        <motion.nav
            variants={{
                visible: { y: 0 },
                hidden: { y: "-100%" },
            }}
            animate={hidden ? "hidden" : "visible"}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none"
        >
            <div className="pointer-events-auto bg-white/80 backdrop-blur-md border border-zinc-200 rounded-full px-6 py-3 flex items-center gap-8 shadow-sm">
                <Link href="/" className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-zinc-900 border border-zinc-800" />
                    <span className="font-bold tracking-tight text-zinc-900 hidden md:block">SATELINK</span>
                </Link>

                {/* Desktop Nav */}
                <div className="hidden md:flex items-center gap-6">
                    {links.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
                        >
                            {link.label}
                        </Link>
                    ))}
                </div>

                <div className="flex items-center gap-4">
                    <Button asChild size="sm" className="bg-zinc-900 text-white hover:bg-zinc-800 rounded-full h-8 px-4 text-xs font-bold">
                        <Link href="/login">
                            Launch <ArrowRight className="ml-1 w-3 h-3" />
                        </Link>
                    </Button>

                    {/* Mobile Menu Toggle */}
                    <button className="md:hidden text-zinc-900" onClick={() => setIsOpen(!isOpen)}>
                        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Mobile Nav Overlay */}
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-20 left-4 right-4 bg-white border border-zinc-200 rounded-2xl p-4 pointer-events-auto md:hidden shadow-xl"
                >
                    <div className="flex flex-col gap-4">
                        {links.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setIsOpen(false)}
                                className="text-lg font-medium text-zinc-600 hover:text-zinc-900 px-4 py-2 hover:bg-zinc-50 rounded-lg"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                </motion.div>
            )}
        </motion.nav>
    );
}
