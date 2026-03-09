import SystemPanel from '@/components/SystemPanel';
import TemperatureGauge from '@/components/TemperatureGauge';
import DashboardGrid from '@/components/DashboardGrid';
import NetworkPanel from '@/components/NetworkPanel';

export default function DashboardOverview() {
    return (
        <div className="space-y-8 pb-12">
            {/* Overview Head */}
            <section className="flex justify-between items-end border-b border-[#1e3a8a] pb-6">
                <div>
                    <div className="font-mono text-[10px] text-[#00d9ff] uppercase tracking-widest mb-2 glow-blue">SYS_STATUS: OPERATIONAL</div>
                    <h1 className="text-3xl font-['Orbitron'] font-bold text-white tracking-widest uppercase">System Overview</h1>
                </div>
                <div className="text-right">
                    <div className="font-mono text-[10px] text-[#94a3b8] uppercase tracking-widest mb-1">NETWORK_SYNC</div>
                    <div className="text-[#22d3ee] font-mono text-[12px] animate-pulse">100.00% SYNCED</div>
                </div>
            </section>

            {/* Primary Metrics Layer */}
            <DashboardGrid>
                <SystemPanel title="LIVE_REVENUE" glowColor="cyan" className="flex flex-col justify-center">
                    <div className="text-[#94a3b8] font-mono text-[10px] uppercase mb-2">Total Accumulated</div>
                    <div className="text-3xl font-bold font-['Orbitron'] text-white tracking-widest">12,450 <span className="text-[#00d9ff]">SAT</span></div>
                </SystemPanel>
                <SystemPanel title="UPTIME_VERIFICATION" glowColor="blue">
                    <div className="h-full flex items-center justify-center">
                        <div className="text-center">
                            <div className="text-4xl font-['Orbitron'] font-bold text-[#00d9ff] glow-blue tracking-widest">99.98%</div>
                            <div className="text-[10px] text-[#94a3b8] uppercase tracking-widest mt-2">Avg_Node_Uptime</div>
                        </div>
                    </div>
                </SystemPanel>
                <SystemPanel title="TOTAL_OPS" glowColor="orange">
                    <div className="h-full flex items-center justify-center">
                        <div className="text-center">
                            <div className="text-4xl font-['Orbitron'] font-bold text-[#ff7a00] glow-orange tracking-widest">1.40M</div>
                            <div className="text-[10px] text-[#94a3b8] uppercase tracking-widest mt-2">Operations Processed</div>
                        </div>
                    </div>
                </SystemPanel>
            </DashboardGrid>

            {/* Main Diagnostic Layer (Layout using Temperature + Panels) */}
            <div className="grid md:grid-cols-3 gap-8">

                {/* Core Temperature (Central UI element) */}
                <div className="md:col-span-1">
                    <SystemPanel title="CORE_THERMALS" glowColor="cyan" className="h-full flex items-center justify-center min-h-[300px]">
                        <TemperatureGauge temp={68} />
                    </SystemPanel>
                </div>

                {/* Diagnostic Logs / Active Nodes */}
                <div className="md:col-span-2 space-y-8">
                    <SystemPanel title="ACTIVE_REPLICAS" glowColor="blue">
                        <div className="divide-y divide-[#1e3a8a]">
                            {[
                                { id: "node-[US_EAST]-1xA9", type: "RPC_GATEWAY", status: "SYS_HEALTHY", uptime: "99.99%", load: "42%" },
                                { id: "node-[EU_WEST]-2xF1", type: "COMPUTE_ENGINE", status: "SYS_HEALTHY", uptime: "99.95%", load: "78%" },
                                { id: "node-[AP_SOUTH]-8x9B", type: "AUTOMATION_PROC", status: "SYS_SYNCING", uptime: "98.12%", load: "14%" },
                            ].map((node, i) => (
                                <div key={i} className="py-4 flex justify-between items-center group hover:bg-[#1e3a8a]/20 transition-colors">
                                    <div>
                                        <div className="font-['Orbitron'] font-bold text-white tracking-widest mb-1">{node.id}</div>
                                        <div className="font-mono text-[10px] text-[#94a3b8] uppercase tracking-widest">{node.type}</div>
                                    </div>
                                    <div className="flex text-right gap-8 items-center">
                                        <div>
                                            <div className="font-mono text-[10px] text-[#94a3b8] uppercase tracking-widest mb-1">UPTIME</div>
                                            <div className="font-mono text-[12px] text-white tracking-widest">{node.uptime}</div>
                                        </div>
                                        <div>
                                            <div className="font-mono text-[10px] text-[#94a3b8] uppercase tracking-widest mb-1">LOAD</div>
                                            <div className="font-mono text-[12px] text-white tracking-widest group-hover:text-[#00d9ff] transition-colors">{node.load}</div>
                                        </div>
                                        <div className="w-24 text-right">
                                            <span className={`font-mono text-[10px] tracking-widest uppercase ${node.status === 'SYS_HEALTHY' ? 'text-[#22d3ee] glow-cyan' : 'text-[#ff7a00] glow-orange'}`}>
                                                {node.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </SystemPanel>

                    <NetworkPanel ops="142.5K" latency="18ms" throughput="22.1 Tbps" nodes={3} />
                </div>
            </div>

            {/* Epoch & Earnings Grid */}
            <div className="grid md:grid-cols-2 gap-8">
                <SystemPanel title="EPOCH_REVENUE_BREAKDOWN" glowColor="orange">
                    <div className="space-y-6">
                        <div className="flex justify-between items-end border-b border-[#1e3a8a] pb-2">
                            <span className="font-mono text-[10px] text-[#94a3b8] uppercase tracking-widest">Base_Uptime_Yield</span>
                            <span className="font-['Orbitron'] font-bold text-white tracking-widest">800 <span className="text-[#00d9ff]">SAT</span></span>
                        </div>
                        <div className="flex justify-between items-end border-b border-[#1e3a8a] pb-2">
                            <span className="font-mono text-[10px] text-[#94a3b8] uppercase tracking-widest">RPC_Route_Fees</span>
                            <span className="font-['Orbitron'] font-bold text-white tracking-widest">250 <span className="text-[#00d9ff]">SAT</span></span>
                        </div>
                        <div className="flex justify-between items-end border-b border-[#1e3a8a] pb-2">
                            <span className="font-mono text-[10px] text-[#94a3b8] uppercase tracking-widest">Compute_Bounties</span>
                            <span className="font-['Orbitron'] font-bold text-white tracking-widest">200 <span className="text-[#00d9ff]">SAT</span></span>
                        </div>
                        <div className="flex justify-between items-center bg-[#00d9ff]/10 border border-[#00d9ff]/30 p-4 mt-6 glow-blue">
                            <span className="font-mono text-[12px] text-white uppercase tracking-widest">CURRENT_EPOCH_YIELD</span>
                            <span className="font-['Orbitron'] text-xl font-bold text-[#00d9ff] tracking-widest">1,250 <span className="text-white text-sm">SAT</span></span>
                        </div>
                    </div>
                </SystemPanel>

                <SystemPanel title="EPOCH_HISTORYLOG" glowColor="blue">
                    <div className="divide-y divide-[#1e3a8a]">
                        {[
                            { epoch: "142", date: "2026-03-01", earning: "1,180", status: "CLAIMED" },
                            { epoch: "141", date: "2026-02-15", earning: "1,205", status: "CLAIMED" },
                            { epoch: "140", date: "2026-02-01", earning: "950", status: "VERIFIED" },
                        ].map((ep, i) => (
                            <div key={i} className="py-4 flex justify-between items-center group hover:bg-[#1e3a8a]/20 transition-colors">
                                <div>
                                    <div className="font-['Orbitron'] font-bold text-white tracking-widest mb-1">EPOCH_{ep.epoch}</div>
                                    <div className="font-mono text-[10px] text-[#94a3b8] uppercase tracking-widest">TS: {ep.date}</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-['Orbitron'] font-bold text-white tracking-widest mb-1">{ep.earning} <span className="text-[#94a3b8]">SAT</span></div>
                                    <div className={`font-mono text-[10px] tracking-widest uppercase ${ep.status === 'CLAIMED' ? 'text-[#22d3ee] glow-cyan' : 'text-[#ff7a00] glow-orange'}`}>{ep.status}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </SystemPanel>
            </div>
        </div>
    );
}
