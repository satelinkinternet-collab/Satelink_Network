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
        primary: "bg-[#408A71] text-[#091413] hover:bg-[#285A48] font-bold shadow-[0_0_20px_rgba(0,209,255,0.15)]",
        secondary: "bg-transparent text-[#B0E4CC] border border-[#408A71] hover:border-[#00D1FF] hover:text-[#00D1FF]",
        outline: "bg-transparent text-[#B0E4CC] border border-[#285A48] hover:bg-[#0d1f1d] hover:border-[#408A71]",
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
