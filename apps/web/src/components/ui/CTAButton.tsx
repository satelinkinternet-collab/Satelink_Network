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
        primary: "bg-[#FFF6E0] hover:bg-[#FFF6E0]/90 text-[#272829] shadow-lg shadow-[#FFF6E0]/20",
        secondary: "bg-[#1E1F20] hover:bg-[#2F3031] text-[#D8D9DA] border border-[#61677A]",
        outline: "bg-transparent hover:bg-[#1E1F20] text-[#D8D9DA] border border-[#61677A]",
    };

    return (
        <Link href={href} className={`${base} ${variants[variant]} ${className}`}>
            {children}
        </Link>
    );
}
