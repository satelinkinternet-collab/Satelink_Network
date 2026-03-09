'use client';

import { Activity, Shield, Terminal, Zap } from 'lucide-react';
import Link from 'next/link';

export default function HudFooter() {
    return (
        <footer className="border-t-2 border-[#0ea5e9] bg-[#020617] relative overflow-hidden">
            {/* Decorative Grid Background */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#00d9ff 1px, transparent 1px), linear-gradient(90deg, #00d9ff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

            <div className="max-w-7xl mx-auto px-6 py-12 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                    {/* Brand Column */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-1 border border-[#00d9ff] bg-[#06122e] panel-glow">
                                <Activity className="w-5 h-5 text-[#00d9ff]" />
                            </div>
                            <span className="font-['Orbitron'] font-bold text-xl text-white tracking-widest text-glow-cyan">SATELINK</span>
                        </div>
                        <p className="text-[#94a3b8] font-mono text-xs leading-relaxed max-w-xs">
                            SECURE DECENTRALIZED INFRASTRUCTURE FOR THE AUTONOMOUS MACHINE ECONOMY.
                        </p>
                        <div className="flex gap-4 pt-4">
                            <div className="w-8 h-8 rounded border border-[#0ea5e9] flex items-center justify-center text-[#22d3ee] hover:bg-[#0ea5e9]/20 cursor-pointer transition-colors">
                                <Terminal className="w-4 h-4" />
                            </div>
                            <div className="w-8 h-8 rounded border border-[#0ea5e9] flex items-center justify-center text-[#22d3ee] hover:bg-[#0ea5e9]/20 cursor-pointer transition-colors">
                                <Shield className="w-4 h-4" />
                            </div>
                            <div className="w-8 h-8 rounded border border-[#0ea5e9] flex items-center justify-center text-[#22d3ee] hover:bg-[#0ea5e9]/20 cursor-pointer transition-colors">
                                <Zap className="w-4 h-4" />
                            </div>
                        </div>
                    </div>

                    {/* Links Columns */}
                    <div>
                        <h4 className="font-['Orbitron'] font-bold text-white tracking-widest mb-6">NETWORK</h4>
                        <ul className="space-y-3 font-mono text-xs">
                            <li><Link href="/network" className="text-[#94a3b8] hover:text-[#00d9ff] flex items-center gap-2"><span className="text-[#00d9ff]">&gt;</span> GLOBAL MAP</Link></li>
                            <li><Link href="/node-operators" className="text-[#94a3b8] hover:text-[#00d9ff] flex items-center gap-2"><span className="text-[#00d9ff]">&gt;</span> OPERATORS</Link></li>
                            <li><Link href="#" className="text-[#94a3b8] hover:text-[#00d9ff] flex items-center gap-2"><span className="text-[#00d9ff]">&gt;</span> TELEMETRY</Link></li>
                            <li><Link href="#" className="text-[#94a3b8] hover:text-[#00d9ff] flex items-center gap-2"><span className="text-[#00d9ff]">&gt;</span> STATUS</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-['Orbitron'] font-bold text-white tracking-widest mb-6">SYSTEMS</h4>
                        <ul className="space-y-3 font-mono text-xs">
                            <li><Link href="/products" className="text-[#94a3b8] hover:text-[#00d9ff] flex items-center gap-2"><span className="text-[#00d9ff]">&gt;</span> PROTOCOLS</Link></li>
                            <li><Link href="/developers" className="text-[#94a3b8] hover:text-[#00d9ff] flex items-center gap-2"><span className="text-[#00d9ff]">&gt;</span> TERMINAL</Link></li>
                            <li><Link href="#" className="text-[#94a3b8] hover:text-[#00d9ff] flex items-center gap-2"><span className="text-[#00d9ff]">&gt;</span> ARCHITECTURE</Link></li>
                            <li><Link href="/pricing" className="text-[#94a3b8] hover:text-[#00d9ff] flex items-center gap-2"><span className="text-[#00d9ff]">&gt;</span> ALLOCATION</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-['Orbitron'] font-bold text-white tracking-widest mb-6">SYS_STATUS</h4>
                        <div className="panel-hud p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="font-mono text-[10px] text-[#94a3b8]">CORE:</span>
                                <span className="font-mono text-[10px] text-[#00d9ff] text-glow-cyan font-bold">ONLINE</span>
                            </div>
                            <div className="w-full h-1 bg-[#020617] rounded-full overflow-hidden">
                                <div className="w-full h-full bg-[#00d9ff] glow-cyan"></div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="font-mono text-[10px] text-[#94a3b8]">LOAD:</span>
                                <span className="font-mono text-[10px] text-[#ff7a00] font-bold">OPTIMAL</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t border-[#0ea5e9]/30 flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-[10px] text-[#94a3b8]">
                    <p>© 2026 SATELINK PROTOCOL. ALL RIGHTS RESERVED.</p>
                    <div className="flex gap-6">
                        <Link href="#" className="hover:text-[#00d9ff] transition-colors">PRIVACY_POLICY</Link>
                        <Link href="#" className="hover:text-[#00d9ff] transition-colors">TOS</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
