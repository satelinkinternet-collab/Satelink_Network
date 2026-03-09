'use client';
import { motion } from 'framer-motion';

interface HudGaugeProps {
    percentage: number;
    size?: number;
    color?: 'cyan' | 'blue' | 'red' | 'orange';
}

export default function HudGauge({ percentage, size = 120, color = 'cyan' }: HudGaugeProps) {
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    const colorMap = {
        cyan: '#22d3ee',
        blue: '#00d9ff',
        red: '#ff2d55',
        orange: '#ff7a00',
    };

    const glowMap = {
        cyan: 'drop-shadow(0 0 8px #22d3ee)',
        blue: 'drop-shadow(0 0 8px #00d9ff)',
        red: 'drop-shadow(0 0 8px #ff2d55)',
        orange: 'drop-shadow(0 0 8px #ff7a00)',
    };

    return (
        <div className="relative flex items-center justify-center font-['Orbitron']" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke="#1e3a8a"
                    strokeWidth={strokeWidth}
                    className="opacity-30"
                />
                <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke={colorMap[color]}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    style={{ filter: glowMap[color] }}
                    strokeLinecap="round"
                />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
                <span className="text-xl font-bold" style={{ color: colorMap[color], textShadow: `0 0 8px ${colorMap[color]}` }}>
                    {percentage.toFixed(0)}%
                </span>
            </div>
        </div>
    );
}
