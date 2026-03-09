import SystemPanel from '@/components/SystemPanel';

export default function NodesPage() {
    return (
        <div className="space-y-8 pb-12">
            <section className="flex justify-between items-end border-b border-[#1e3a8a] pb-6">
                <div>
                    <div className="font-mono text-[10px] text-[#00d9ff] uppercase tracking-widest mb-2 glow-blue">SYS_MODULE: COMPUTE_LAYER</div>
                    <h1 className="text-3xl font-['Orbitron'] font-bold text-white tracking-widest uppercase">Node Topology</h1>
                </div>
                <button className="px-4 py-2 bg-[#22d3ee]/10 border border-[#22d3ee] text-[#22d3ee] hover:bg-[#22d3ee] hover:text-[#020617] font-mono text-[10px] uppercase tracking-widest transition-colors glow-cyan">
                    INITIALIZE_NEW_DEPLOYMENT
                </button>
            </section>

            <SystemPanel title="DEPLOYED_INFRASTRUCTURE" glowColor="blue" className="min-h-[400px]">
                <div className="flex flex-col items-center justify-center h-full opacity-50 space-y-4">
                    <div className="w-16 h-16 border border-[#22d3ee] rounded-full flex items-center justify-center bg-[#22d3ee]/10 glow-cyan">
                        <div className="w-8 h-8 rounded-full border border-[#22d3ee] border-t-transparent animate-spin"></div>
                    </div>
                    <div className="font-mono text-[#22d3ee] text-[10px] uppercase tracking-widest">SCANNING_TOPOLOGY...</div>
                </div>
            </SystemPanel>
        </div>
    );
}
