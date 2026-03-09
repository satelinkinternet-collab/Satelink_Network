'use client';

interface StatBoxProps {
    label: string;
    value: string | number;
    color?: 'blue' | 'cyan' | 'red' | 'orange';
    className?: string;
}

export default function StatBox({ label, value, color = 'blue', className = '' }: StatBoxProps) {
    const colorStyles = {
        blue: 'text-[#00d9ff] text-glow-blue border-[#00d9ff]',
        cyan: 'text-[#22d3ee] text-glow-cyan border-[#22d3ee]',
        red: 'text-[#ff2d55] text-glow-red border-[#ff2d55]',
        orange: 'text-[#ff7a00] border-[#ff7a00]'
    };

    const bgStyles = {
        blue: 'bg-[#00d9ff]/10',
        cyan: 'bg-[#22d3ee]/10',
        red: 'bg-[#ff2d55]/10',
        orange: 'bg-[#ff7a00]/10'
    };

    return (
        <div className={`relative p-4 bg-[#020617] border border-[#0ea5e9]/30 overflow-hidden ${className}`}>
            {/* Decorative corner */}
            <div className={`absolute top-0 right-0 w-2 h-2 border-t border-r ${colorStyles[color]}`}></div>
            <div className={`absolute bottom-0 right-0 w-16 h-16 blur-2xl opacity-20 rounded-full ${bgStyles[color]} -mr-8 -mb-8`}></div>

            <div className={`font-['Orbitron'] font-bold text-2xl md:text-3xl mb-1 ${colorStyles[color].split(' ')[0]} ${colorStyles[color].split(' ')[1] || ''}`}>
                {value}
            </div>
            <div className="font-mono text-[10px] text-[#94a3b8] tracking-[0.2em] uppercase">
                {label}
            </div>
        </div>
    );
}
