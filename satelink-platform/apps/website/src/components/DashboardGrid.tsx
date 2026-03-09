'use client';

import React from 'react';

export default function DashboardGrid({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
            {children}
        </div>
    );
}
