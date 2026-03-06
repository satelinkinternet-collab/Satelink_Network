import React from 'react';
import Link from 'next/link';

interface CTAButtonProps {
    href: string;
    variant?: 'primary' | 'secondary' | 'outline';
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
}

export function CTAButton({ href, variant = 'primary', children, className = "", onClick }: CTAButtonProps) {
    const baseStyles = "inline-flex items-center justify-center font-medium rounded-2xl transition-all duration-300 px-6 py-3 min-h-[48px]";

    const variants = {
        primary: "bg-white text-zinc-950 hover:bg-zinc-200 shadow-[0_0_20px_rgba(255,255,255,0.15)]",
        secondary: "bg-[#111111] text-white border border-[#262626] hover:bg-[#1A1A1A]",
        outline: "bg-transparent text-white border border-[#262626] hover:bg-[#111111]",
    };

    if (onClick) {
        return (
            <button onClick={onClick} className={`${baseStyles} ${variants[variant]} ${className}`}>
                {children}
            </button>
        );
    }

    return (
        <Link href={href} className={`${baseStyles} ${variants[variant]} ${className}`}>
            {children}
        </Link>
    );
}
