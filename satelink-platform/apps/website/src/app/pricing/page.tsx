import { Check } from 'lucide-react';
import Link from 'next/link';
import SystemPanel from '@/components/SystemPanel';

export default function PricingPage() {
    return (
        <div className="max-w-7xl mx-auto px-6 space-y-20 pb-20 pt-20">
            <header className="text-center pt-20">
                <div className="inline-block px-3 py-1 border border-[#0ea5e9] text-[#0ea5e9] font-mono text-[10px] tracking-widest bg-[#0ea5e9]/10 glow-cyan mb-8 uppercase">
                    ALLOCATION_MATRIX
                </div>
                <h1 className="text-4xl md:text-5xl font-['Orbitron'] font-bold text-white mb-6 tracking-widest text-glow-cyan uppercase">
                    Resource Allocation
                </h1>
                <p className="text-xl font-mono text-[#94a3b8] max-w-2xl mx-auto leading-relaxed uppercase tracking-widest">
                    Select a bandwidth tier for your infrastructure needs. No enterprise lock-in.
                </p>
            </header>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">
                {/* Development Tier */}
                <SystemPanel title="DEVELOPMENT" glowColor="cyan" className="h-full flex flex-col">
                    <div className="mb-6 border-b border-[#1e3a8a] pb-4">
                        <p className="font-mono text-[10px] text-[#94a3b8] tracking-widest uppercase">Prototype Environment</p>
                    </div>
                    <div className="mb-8 flex items-baseline gap-1">
                        <span className="text-4xl font-['Orbitron'] font-bold text-white text-glow-cyan">$0</span>
                        <span className="font-mono text-sm text-[#94a3b8] uppercase">/mo</span>
                    </div>
                    <ul className="space-y-4 font-mono text-[12px] text-[#E5E7EB] mb-8 flex-grow uppercase tracking-widest">
                        <li className="flex items-center gap-3">
                            <Check className="w-4 h-4 text-[#22d3ee]" /> 100,000 req/day
                        </li>
                        <li className="flex items-center gap-3">
                            <Check className="w-4 h-4 text-[#22d3ee]" /> Community Nodes
                        </li>
                        <li className="flex items-center gap-3 text-[#475569]">
                            <span className="w-4 h-4 flex items-center justify-center border border-[#1e3a8a] text-[10px]">-</span>
                            Dedicated Support
                        </li>
                    </ul>
                    <Link
                        href="/developers"
                        className="w-full py-3 text-center border border-[#1e3a8a] font-mono text-[12px] text-[#94a3b8] uppercase tracking-widest hover:bg-[#1e3a8a] hover:text-white transition-colors"
                    >
                        INITIALIZE DB
                    </Link>
                </SystemPanel>

                {/* Production Tier (Highlighted) */}
                <SystemPanel title="PRODUCTION" glowColor="blue" className="h-full flex flex-col border-[2px] border-[#00d9ff] transform md:-translate-y-4 panel-glow">
                    <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-[#00d9ff] text-[#020617] font-['Orbitron'] text-xs font-bold px-4 py-1 tracking-widest shadow-[0_0_15px_#00d9ff]">
                        MAINSTREAM
                    </div>
                    <div className="mb-6 border-b border-[#00d9ff]/30 pb-4">
                        <p className="font-mono text-[10px] text-[#00d9ff] tracking-widest uppercase text-glow-blue">Live Deployment</p>
                    </div>
                    <div className="mb-8 flex items-baseline gap-1">
                        <span className="text-5xl font-['Orbitron'] font-bold text-[#00d9ff] text-glow-blue">$49</span>
                        <span className="font-mono text-sm text-[#00d9ff]/70 uppercase">/mo</span>
                    </div>
                    <ul className="space-y-4 font-mono text-[12px] text-[#E5E7EB] mb-8 flex-grow uppercase tracking-widest">
                        <li className="flex items-center gap-3">
                            <Check className="w-4 h-4 text-[#00d9ff]" /> 10,000,000 req/mo
                        </li>
                        <li className="flex items-center gap-3">
                            <Check className="w-4 h-4 text-[#00d9ff]" /> Premium RPC Routing
                        </li>
                        <li className="flex items-center gap-3">
                            <Check className="w-4 h-4 text-[#00d9ff]" /> Compute Access
                        </li>
                        <li className="flex items-center gap-3">
                            <Check className="w-4 h-4 text-[#00d9ff]" /> 24h SLA Support
                        </li>
                    </ul>
                    <Link
                        href="/developers"
                        className="w-full py-3 text-center font-mono text-[12px] font-bold bg-[#00d9ff]/20 border border-[#00d9ff] text-[#00d9ff] uppercase tracking-widest hover:bg-[#00d9ff] hover:text-[#020617] transition-all glow-blue"
                    >
                        DEPLOY TIER
                    </Link>
                </SystemPanel>

                {/* Enterprise Tier */}
                <SystemPanel title="ENTERPRISE" glowColor="orange" className="h-full flex flex-col">
                    <div className="mb-6 border-b border-[#1e3a8a] pb-4">
                        <p className="font-mono text-[10px] text-[#94a3b8] tracking-widest uppercase">Massive Scale</p>
                    </div>
                    <div className="mb-8">
                        <span className="text-4xl font-['Orbitron'] font-bold text-[#ff7a00] text-glow-orange">CUSTOM</span>
                    </div>
                    <ul className="space-y-4 font-mono text-[12px] text-[#E5E7EB] mb-8 flex-grow uppercase tracking-widest">
                        <li className="flex items-center gap-3">
                            <Check className="w-4 h-4 text-[#ff7a00]" /> Unlimited Capacity
                        </li>
                        <li className="flex items-center gap-3">
                            <Check className="w-4 h-4 text-[#ff7a00]" /> Dedicated Global Edge
                        </li>
                        <li className="flex items-center gap-3">
                            <Check className="w-4 h-4 text-[#ff7a00]" /> Custom Automation
                        </li>
                        <li className="flex items-center gap-3">
                            <Check className="w-4 h-4 text-[#ff7a00]" /> Direct Comm Channel
                        </li>
                    </ul>
                    <Link
                        href="/contact"
                        className="w-full py-3 text-center border border-[#ff7a00]/50 font-mono text-[12px] text-[#ff7a00] uppercase tracking-widest hover:bg-[#ff7a00]/20 transition-colors"
                    >
                        CONTACT PROTOCOL
                    </Link>
                </SystemPanel>
            </div>
        </div>
    );
}
