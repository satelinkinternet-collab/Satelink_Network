'use client';
import { motion } from 'framer-motion';

export default function TemperatureGauge({ temp, label = 'CPU TEMP' }: { temp: number, label?: string }) {
    const size = 200;
    const strokeWidth = 12;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    // Arc is 3/4 of a circle
    const arcLength = circumference * 0.75;
    const percentage = Math.min(Math.max((temp / 100), 0), 1);
    const strokeDashoffset = arcLength - (percentage * arcLength);

    // Dynamic color scale based on temperature
    const color = temp >= 80 ? '#ff2d55' : temp >= 60 ? '#ff7a00' : '#0ea5e9';
    const glow = `drop-shadow(0 0 10px ${color})`;

    return (
        <div className="relative flex items-center justify-center font-['Orbitron'] mx-auto" style={{ width: size, height: size }}>

            {/* Background Decorative Rings */}
            <motion.div
                className="absolute inset-0 rounded-full border border-[#1e3a8a] border-dashed opacity-50"
                animate={{ rotate: 360 }}
                transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
            />
            <div className="absolute inset-4 rounded-full border border-[#0ea5e9]/20"></div>

            <svg width={size} height={size} className="transform -rotate-[225deg]">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke="#1e3a8a"
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${arcLength} ${circumference * 0.25}`}
                    className="opacity-30"
                    strokeLinecap="round"
                />
                <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${arcLength} ${circumference * 0.25}`}
                    initial={{ strokeDashoffset: arcLength }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 2, ease: "easeOut" }}
                    style={{ filter: glow }}
                    strokeLinecap="round"
                />
            </svg>

            {/* Center Label */}
            <div className="absolute flex flex-col items-center justify-center pt-4">
                <div className="font-mono text-[10px] text-[#0ea5e9] tracking-widest mb-1">{label}</div>
                <span className="text-4xl font-bold" style={{ color: color, textShadow: `0 0 10px ${color}` }}>
                    {temp.toFixed(1)} <span className="text-xl">°C</span>
                </span>
            </div>
        </div>
    );
}
