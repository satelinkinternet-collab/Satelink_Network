import React from "react";

interface SectionContainerProps {
    children: React.ReactNode;
    className?: string;
}

export function SectionContainer({ children, className = "" }: SectionContainerProps) {
    return (
        <section className={`py-20 md:py-32 ${className}`}>
            <div className="container mx-auto px-6 max-w-6xl">
                {children}
            </div>
        </section>
    );
}
