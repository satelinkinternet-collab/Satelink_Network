'use client';

import React from 'react';

interface SystemPanelProps {
    children: React.ReactNode;
    title?: string;
    className?: string;
    glowColor?: 'blue' | 'cyan' | 'red' | 'orange';
}

export default function SystemPanel({ children, title, className = '', glowColor = 'blue' }: SystemPanelProps) {
    const glowClasses = {
        blue: 'hover:glow-blue hover:border-[#00d9ff]',
        cyan: 'hover:glow-cyan hover:border-[#22d3ee]',
        red: 'hover:glow-red hover:border-[#ff2d55]',
        orange: 'hover:glow-orange hover:border-[#ff7a00]'
    };

    return (
        <div className={`panel-hud p-6 transition-all duration-300 ${glowClasses[glowColor]} ${className}`}>
            {title && (
                <div className="border-b border-[#0ea5e9]/50 pb-4 mb-4 flex items-center justify-between">
                    <h3 className="font-['Orbitron'] font-bold text-white tracking-widest text-glow-blue">{title}</h3>
                    <div className="w-2 h-2 rounded-full bg-[#00d9ff] animate-pulse glow-blue"></div>
                </div>
            )}
            {children}
        </div>
    );
}
