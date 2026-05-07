import React from "react";
import Link from "next/link";

interface CTAButtonProps {
    href: string;
    variant?: "primary" | "secondary" | "outline";
    className?: string;
    children: React.ReactNode;
}

export function CTAButton({ href, variant = "primary", className = "", children }: CTAButtonProps) {
    const base = "inline-flex items-center justify-center font-bold rounded-lg transition-all text-sm px-6 py-3";
    const variants: Record<string, string> = {
        primary: "bg-[#408A71] hover:bg-[#285A48] text-[#091413] border-none shadow-lg hover:shadow-[0_0_20px_rgba(0,209,255,0.3)]",
        secondary: "bg-transparent border border-[#408A71] text-[#B0E4CC] hover:border-[#00D1FF] hover:text-[#00D1FF]",
        outline: "bg-transparent border border-[#285A48] text-[#B0E4CC] hover:bg-[#0d1f1d] hover:border-[#408A71]",
    };

    return (
        <Link href={href} className={`${base} ${variants[variant]} ${className}`}>
            {children}
        </Link>
    );
}
