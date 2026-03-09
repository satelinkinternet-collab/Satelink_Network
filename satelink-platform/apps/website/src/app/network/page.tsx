import NetworkPanel from '@/components/NetworkPanel';
import MemoryPanel from '@/components/MemoryPanel';
import SystemPanel from '@/components/SystemPanel';

export default function NetworkPage() {
    return (
        <div className="max-w-7xl mx-auto px-6 space-y-20 pb-20 pt-20">
            <header className="text-center pt-20">
                <div className="inline-block px-3 py-1 border border-[#00d9ff] text-[#00d9ff] font-mono text-[10px] tracking-widest bg-[#00d9ff]/10 glow-blue mb-8">
                    SYS_MODULE: GLOBAL_ROUTING_LAYER
                </div>
                <h1 className="text-4xl md:text-5xl font-['Orbitron'] font-bold text-white mb-6 tracking-widest text-glow-cyan uppercase">
                    Global Network Map
                </h1>
                <p className="text-xl font-mono text-[#94a3b8] max-w-2xl mx-auto leading-relaxed uppercase tracking-widest">
                    Real-time visualization of the decentralized infrastructure routing layer.
                </p>
            </header>

            {/* Network Metrics Panels */}
            <section className="grid md:grid-cols-2 gap-8">
                <NetworkPanel ops="52.4M" latency="42ms" throughput="89.4 Tbps" />
                <MemoryPanel freeMem="412.8 TB" usedMem="1.2 PB" dlSpeed="14.2 Tbps" ulSpeed="12.8 Tbps" />
            </section>

            {/* Infrastructure Details Layout */}
            <div className="grid md:grid-cols-3 gap-8">
                {/* Left Side: Security & Architecture Info */}
                <div className="space-y-8">
                    <SystemPanel title="CORE_ARCHITECTURE" glowColor="cyan">
                        <ul className="space-y-4 font-mono text-[12px] text-[#94a3b8] uppercase tracking-widest">
                            <li className="flex items-start gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#00d9ff] mt-1.5 glow-blue"></div>
                                Delegated BFT Consensus Engine
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#00d9ff] mt-1.5 glow-blue"></div>
                                Optimized P2P Gossip Propagation
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#00d9ff] mt-1.5 glow-blue"></div>
                                Zero-Knowledge Payload Verification
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#00d9ff] mt-1.5 glow-blue"></div>
                                Automated Slashing & Economics
                            </li>
                        </ul>
                    </SystemPanel>
                </div>

                {/* Right Side: Region List */}
                <div className="md:col-span-2">
                    <SystemPanel title="ACTIVE_CONTINENTAL_HUBS" glowColor="blue" className="h-full">
                        <div className="flex justify-between items-center border-b border-[#1e3a8a] pb-4 mb-4">
                            <div className="font-mono text-[10px] text-[#00d9ff] tracking-widest uppercase text-glow-blue">Live Routing Regions</div>
                            <div className="flex items-center gap-2 px-3 py-1 bg-[#22d3ee]/10 border border-[#22d3ee] glow-cyan">
                                <div className="w-2 h-2 rounded-full bg-[#22d3ee] animate-pulse"></div>
                                <span className="font-mono text-[10px] font-bold text-[#22d3ee] tracking-widest uppercase">SYS_SECURE</span>
                            </div>
                        </div>

                        <div className="divide-y divide-[#1e3a8a]">
                            {[
                                { region: "US_EAST_01", location: "N. Virginia", latency: "12ms", load: "34%" },
                                { region: "US_WEST_02", location: "Oregon", latency: "28ms", load: "55%" },
                                { region: "EU_CENTRAL_01", location: "Frankfurt", latency: "15ms", load: "42%" },
                                { region: "AP_NORTHEAST_01", location: "Tokyo", latency: "45ms", load: "28%" },
                                { region: "SA_EAST_01", location: "São Paulo", latency: "85ms", load: "12%" },
                            ].map((hub, i) => (
                                <div key={i} className="py-4 flex flex-col sm:flex-row justify-between sm:items-center hover:bg-[#1e3a8a]/20 transition-colors">
                                    <div className="mb-4 sm:mb-0">
                                        <div className="font-['Orbitron'] font-bold text-white mb-1 tracking-widest">{hub.region}</div>
                                        <div className="font-mono text-[10px] text-[#94a3b8] uppercase tracking-widest">{hub.location}</div>
                                    </div>
                                    <div className="flex items-center gap-12">
                                        <div>
                                            <div className="font-mono text-[10px] text-[#94a3b8] mb-1 uppercase tracking-widest">P99_LATENCY</div>
                                            <div className="font-mono text-[#00d9ff] font-bold">{hub.latency}</div>
                                        </div>
                                        <div className="hidden md:block w-32">
                                            <div className="flex justify-between font-mono text-[10px] text-[#94a3b8] mb-1 uppercase tracking-widest">
                                                <span>SYS_LOAD</span>
                                                <span className="text-white">{hub.load}</span>
                                            </div>
                                            <div className="w-full bg-[#06122e] border border-[#1e3a8a] h-1.5">
                                                <div
                                                    className="bg-[#00d9ff] h-1.5 glow-blue"
                                                    style={{ width: hub.load }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </SystemPanel>
                </div>
            </div>
        </div>
    );
}
