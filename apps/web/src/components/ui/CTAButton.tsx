import React from "react";
import Link from "next/link";

interface CTAButtonProps {
    href: string;
    variant?: "primary" | "secondary" | "outline";
    className?: string;
    children: React.ReactNode;
}

export function CTAButton({ href, variant = "primary", className = "", children }: CTAButtonProps) {
    const base = "inline-flex items-center justify-center font-medium rounded-lg transition-all text-sm px-6 py-3";
    const variants: Record<string, string> = {
        primary: "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20",
        secondary: "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700",
        outline: "bg-transparent hover:bg-zinc-800 text-zinc-300 border border-zinc-700",
    };

    return (
        <Link href={href} className={`${base} ${variants[variant]} ${className}`}>
            {children}
        </Link>
    );
}
