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
        primary: "bg-[#FFF6E0] text-[#272829] hover:bg-[#FFF6E0]/90 shadow-[0_0_20px_rgba(255,246,224,0.15)]",
        secondary: "bg-[#1E1F20] text-[#D8D9DA] border border-[#61677A] hover:bg-[#2F3031]",
        outline: "bg-transparent text-[#D8D9DA] border border-[#61677A] hover:bg-[#1E1F20]",
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
