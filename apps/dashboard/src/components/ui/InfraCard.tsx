import React from 'react';

export function InfraCard({ children, className = "" }: { children: React.ReactNode, className?: string }) {
    return (
        <div className={`bg-card text-card-foreground border border-border rounded-2xl p-6 ${className}`}>
            {children}
        </div>
    );
}
