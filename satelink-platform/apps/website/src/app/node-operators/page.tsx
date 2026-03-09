import Link from 'next/link';
import { Server, Settings } from 'lucide-react';
import SystemPanel from '@/components/SystemPanel';
import StatBox from '@/components/StatBox';

export default function NodeOperatorsPage() {
    return (
        <div className="max-w-6xl mx-auto px-6 space-y-20 pb-20 pt-20">

            <header className="pt-20 text-center max-w-4xl mx-auto">
                <div className="inline-flex items-center gap-2 px-3 py-1 border border-[#0ea5e9] text-[#0ea5e9] font-mono text-[10px] tracking-widest bg-[#0ea5e9]/10 glow-cyan mb-8 uppercase">
                    <Server className="w-4 h-4" /> Provider_Network
                </div>
                <h1 className="text-4xl md:text-6xl font-['Orbitron'] font-bold text-white tracking-widest mb-8 text-glow-cyan uppercase">
                    Node Command Center
                </h1>
                <p className="text-xl font-mono text-[#94a3b8] leading-relaxed mb-10 uppercase tracking-widest">
                    Deploy infrastructure to the network. Earn protocol rewards by securely processing transactions, routing data, and generating proofs.
                </p>
                <Link
                    href="/docs"
                    className="inline-flex px-8 py-3 bg-[#00d9ff]/20 border border-[#00d9ff] text-[#00d9ff] font-mono tracking-widest hover:bg-[#00d9ff] hover:text-[#020617] transition-all uppercase glow-blue"
                >
                    Initialize Node Agent
                </Link>
            </header>

            {/* Hardware Requirements */}
            <section>
                <div className="flex items-center gap-3 mb-8">
                    <Settings className="w-6 h-6 text-[#00d9ff]" />
                    <h2 className="text-2xl font-['Orbitron'] text-white font-bold tracking-widest">HARDWARE_REQUIREMENTS</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Minimum Specs */}
                    <SystemPanel title="STANDARD_GATEWAY" glowColor="cyan" className="h-full flex flex-col">
                        <ul className="space-y-4 font-mono text-[12px] text-[#94a3b8] flex-grow uppercase tracking-widest">
                            <li className="flex justify-between border-b border-[#1e3a8a] pb-3">
                                <span className="font-bold text-[#00d9ff]">CPU</span>
                                <span>4 Cores / 3.0GHz+</span>
                            </li>
                            <li className="flex justify-between border-b border-[#1e3a8a] pb-3">
                                <span className="font-bold text-[#00d9ff]">RAM</span>
                                <span>16GB NVMe Cache</span>
                            </li>
                            <li className="flex justify-between border-b border-[#1e3a8a] pb-3">
                                <span className="font-bold text-[#00d9ff]">STORAGE</span>
                                <span>1TB Gen4 NVMe</span>
                            </li>
                            <li className="flex justify-between border-b border-[#1e3a8a] pb-3">
                                <span className="font-bold text-[#00d9ff]">NETWORK</span>
                                <span>1Gbps Symmetric</span>
                            </li>
                        </ul>
                        <div className="mt-8 pt-4 border-t border-[#1e3a8a] flex justify-between items-center text-[10px] font-mono tracking-widest uppercase">
                            <span className="text-[#94a3b8]">ROLE</span>
                            <span className="text-[#0ea5e9] text-glow-cyan">RPC Gateway Routing</span>
                        </div>
                    </SystemPanel>

                    {/* Pro Specs */}
                    <SystemPanel title="PRO_COMPUTE_NODE" glowColor="orange" className="h-full flex flex-col">
                        <ul className="space-y-4 font-mono text-[12px] text-[#94a3b8] flex-grow uppercase tracking-widest">
                            <li className="flex justify-between border-b border-[#1e3a8a] pb-3">
                                <span className="font-bold text-[#00d9ff]">CPU</span>
                                <span>16 Cores / 4.0GHz+</span>
                            </li>
                            <li className="flex justify-between border-b border-[#1e3a8a] pb-3">
                                <span className="font-bold text-[#00d9ff]">RAM</span>
                                <span>64GB ECC</span>
                            </li>
                            <li className="flex justify-between border-b border-[#1e3a8a] pb-3">
                                <span className="font-bold text-[#00d9ff]">STORAGE</span>
                                <span>4TB Gen4 NVMe (RAID 0)</span>
                            </li>
                            <li className="flex justify-between border-b border-[#1e3a8a] pb-3">
                                <span className="font-bold text-[#00d9ff]">NETWORK</span>
                                <span>10Gbps Dedicated</span>
                            </li>
                        </ul>
                        <div className="mt-8 pt-4 border-t border-[#1e3a8a] flex justify-between items-center text-[10px] font-mono tracking-widest uppercase">
                            <span className="text-[#94a3b8]">ROLE</span>
                            <span className="text-[#ff7a00] text-glow-orange">ZK Proof Generation</span>
                        </div>
                    </SystemPanel>
                </div>
            </section>

            {/* Mock Telemetry Dashboard */}
            <SystemPanel title="OPERATOR_TELEMETRY" glowColor="blue" className="mt-12">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-[#1e3a8a] pb-8 mb-8">
                    <div>
                        <p className="font-mono text-[10px] text-[#94a3b8] uppercase tracking-widest">Live performance tracking and reward economics.</p>
                    </div>
                    <div className="bg-[#020617] p-4 border border-[#1e3a8a] w-full md:w-auto flex items-center justify-between gap-8 shadow-[inset_0_0_15px_rgba(0,0,0,0.5)]">
                        <div>
                            <div className="text-[10px] text-[#94a3b8] mb-1 font-mono tracking-widest uppercase">AVAILABLE_REWARDS</div>
                            <div className="text-xl font-['Orbitron'] font-bold text-[#22d3ee] text-glow-cyan">1,250.42 SAT</div>
                        </div>
                        <button className="px-4 py-2 bg-[#22d3ee]/10 text-[#22d3ee] border border-[#22d3ee] hover:bg-[#22d3ee] hover:text-[#020617] transition-colors font-mono tracking-widest text-[10px] uppercase glow-cyan">
                            CLAIM
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <StatBox label="UPTIME_SCORE" value="99.98%" color="cyan" />
                    <StatBox label="OPS_EXECUTED" value="1.4M" color="blue" />
                    <StatBox label="LIFETIME_SAT" value="12,450" color="cyan" />
                    <StatBox label="SLASH_EVENTS" value="0" color="red" />
                </div>
            </SystemPanel>

        </div>
    );
}
