import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import SystemPanel from '@/components/SystemPanel';

export default function ProductCards() {
    const products = [
        {
            title: "RPC_GATEWAY",
            description: "Direct access to 25+ networks via global geographically distributed edge nodes.",
            latency: "12ms",
            status: "OPERATIONAL",
            color: "cyan",
            href: "/products",
        },
        {
            title: "AUTOMATION_ENGINE",
            description: "Trigger smart contract executions based on off-chain deterministic conditions.",
            latency: "25ms",
            status: "OPERATIONAL",
            color: "blue",
            href: "/products",
        },
        {
            title: "COMPUTE_NETWORK",
            description: "Distribute intensive cryptographic and ZK workloads across thousands of GPUs.",
            latency: "85ms",
            status: "HIGH_LOAD",
            color: "orange",
            href: "/products",
        },
    ];

    return (
        <div className="grid md:grid-cols-3 gap-6">
            {products.map((p, i) => (
                <Link href={p.href} key={i} className="block group">
                    <SystemPanel title={p.title} glowColor={p.color as "cyan" | "blue" | "orange"} className="h-full flex flex-col border-[#1e3a8a] group-hover:border-[#00d9ff] group-hover:shadow-[0_0_15px_rgba(0,217,255,0.2)] transition-all cursor-pointer">
                        <div className="flex justify-end items-start mb-4">
                            <ArrowRight className={`w-5 h-5 text-[#94a3b8] group-hover:text-[#00d9ff] transition-colors`} />
                        </div>

                        <p className="font-mono text-[12px] text-[#94a3b8] mb-8 flex-grow leading-relaxed uppercase tracking-widest">
                            {p.description}
                        </p>

                        <div className="flex justify-between items-end border-t border-[#1e3a8a] pt-4 mt-auto">
                            <div>
                                <div className="font-mono text-[10px] text-[#94a3b8] tracking-widest uppercase mb-1">P99_LATENCY</div>
                                <div className="font-['Orbitron'] text-sm font-bold text-white">{p.latency}</div>
                            </div>
                            <div className="text-right">
                                <div className="font-mono text-[10px] text-[#94a3b8] tracking-widest uppercase mb-1">SYS_STATUS</div>
                                <div className="flex items-center gap-2 justify-end">
                                    <div className={`w-2 h-2 ${p.status === 'HIGH_LOAD' ? 'bg-[#ff7a00] glow-orange' : 'bg-[#00d9ff] glow-blue'}`}></div>
                                    <div className="font-mono text-[10px] tracking-widest uppercase text-white">{p.status}</div>
                                </div>
                            </div>
                        </div>
                    </SystemPanel>
                </Link>
            ))}
        </div>
    );
}
