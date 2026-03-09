import Link from 'next/link';
import { Server, Zap, DollarSign, History, Shield, LayoutDashboard } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const routes = [
        { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
        { name: "Nodes", href: "/dashboard/nodes", icon: Server },
        { name: "Workloads", href: "/dashboard/workloads", icon: Zap },
        { name: "Earnings", href: "/dashboard/earnings", icon: DollarSign },
        { name: "Epoch History", href: "/dashboard/epoch-history", icon: History },
        { name: "Claims", href: "/dashboard/claims", icon: Shield },
    ];

    return (
        <div className="flex h-screen bg-[#020617] text-[#94a3b8] overflow-hidden font-mono text-[12px]">
            {/* Sidebar */}
            <aside className="w-64 border-r border-[#1e3a8a] bg-[#06122e] flex flex-col relative z-20 shadow-[10px_0_30px_rgba(0,0,0,0.5)]">
                <div className="h-16 flex items-center px-6 border-b border-[#1e3a8a] shadow-inner mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#00d9ff]/20 border border-[#00d9ff] flex items-center justify-center font-['Orbitron'] font-bold text-[#00d9ff] text-glow-blue">S</div>
                        <span className="font-['Orbitron'] font-bold text-white tracking-widest text-[14px] uppercase text-glow-cyan">OPERATOR</span>
                    </div>
                </div>

                <div className="px-6 mb-4">
                    <div className="text-[10px] text-[#00d9ff] tracking-widest uppercase mb-4">Telemetry_Control</div>
                </div>

                <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
                    {routes.map((route) => {
                        const Icon = route.icon;
                        return (
                            <Link
                                key={route.name}
                                href={route.href}
                                className="flex items-center gap-3 px-4 py-3 text-[#94a3b8] hover:text-[#00d9ff] hover:bg-[#00d9ff]/10 border border-transparent hover:border-[#00d9ff]/50 transition-all uppercase tracking-widest group"
                            >
                                <Icon className="w-4 h-4 group-hover:text-glow-blue" />
                                {route.name}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-6 border-t border-[#1e3a8a]">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#020617] border border-[#22d3ee] rounded-full flex items-center justify-center glow-cyan relative overflow-hidden">
                            <div className="w-2 h-2 rounded-full bg-[#22d3ee] animate-pulse"></div>
                        </div>
                        <div>
                            <div className="text-[10px] text-white tracking-widest uppercase">SYS_SECURE</div>
                            <div className="text-[10px] text-[#22d3ee]">Nodes: 0x71C...3E4A</div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Layout Area */}
            <div className="flex-1 flex flex-col bg-[#020617] relative">
                <header className="h-16 border-b border-[#1e3a8a] bg-[#06122e]/80 backdrop-blur-md flex items-center justify-between px-8 relative z-10 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 border border-[#ff7a00] bg-[#ff7a00]/20 glow-orange"></div>
                        <span className="text-[10px] text-[#ff7a00] uppercase tracking-widest">LIVE_CONNECTION</span>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="text-right flex flex-col items-end">
                            <span className="text-[10px] text-[#94a3b8] uppercase tracking-widest">EPOCH_143</span>
                            <span className="text-white font-['Orbitron'] font-bold tracking-widest">1,250.00 SAT</span>
                        </div>
                        <button className="px-4 py-3 border border-[#22d3ee] bg-[#22d3ee]/10 text-[#22d3ee] hover:bg-[#22d3ee] hover:text-[#020617] transition-all uppercase tracking-widest text-[10px] glow-cyan">
                            CLAIM_REWARDS
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-8 relative">
                    <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[#00d9ff] opacity-[0.03] blur-[150px] -z-10 rounded-full pointer-events-none"></div>
                    {children}
                </main>
            </div>
        </div>
    );
}
