'use client';
import HudGauge from './HudGauge';

interface TelemetryCircleProps {
    label: string;
    value: string;
    percentage: number;
    color?: 'cyan' | 'blue' | 'red' | 'orange';
}

export default function TelemetryCircle({ label, value, percentage, color = 'cyan' }: TelemetryCircleProps) {
    const glowClass = {
        cyan: 'text-shadow-[0_0_8px_#22d3ee] text-[#22d3ee]',
        blue: 'text-glow-blue text-[#00d9ff]',
        red: 'text-glow-red text-[#ff2d55]',
        orange: 'text-shadow-[0_0_8px_#ff7a00] text-[#ff7a00]',
    };

    return (
        <div className="flex flex-col items-center justify-center space-y-4">
            <HudGauge percentage={percentage} size={140} color={color} />
            <div className="text-center">
                <div className={`font-['Orbitron'] font-bold text-xl mb-1 ${glowClass[color]}`}>
                    {value}
                </div>
                <div className="font-mono text-[10px] text-[#94a3b8] tracking-widest uppercase">
                    {label}
                </div>
            </div>
        </div>
    );
}
