import React from 'react';

export function SectionContainer({ children, className = "", id }: { children: React.ReactNode, className?: string, id?: string }) {
    return (
        <section id={id} className={`py-24 px-6 md:px-12 lg:px-24 w-full max-w-7xl mx-auto ${className}`}>
            {children}
        </section>
    );
}
