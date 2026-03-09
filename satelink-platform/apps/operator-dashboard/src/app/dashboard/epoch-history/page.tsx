import SystemPanel from '@/components/SystemPanel';

export default function EpochHistoryPage() {
    return (
        <div className="space-y-8 pb-12">
            <section className="flex justify-between items-end border-b border-[#1e3a8a] pb-6">
                <div>
                    <div className="font-mono text-[10px] text-[#00d9ff] uppercase tracking-widest mb-2 glow-blue">SYS_MODULE: TIME_CHAIN</div>
                    <h1 className="text-3xl font-['Orbitron'] font-bold text-white tracking-widest uppercase">Epoch History</h1>
                </div>
            </section>

            <SystemPanel title="HISTORICAL_LEDGER" glowColor="cyan" className="min-h-[400px]">
                <div className="flex flex-col items-center justify-center h-full opacity-50 space-y-4">
                    <div className="w-16 h-16 border rounded-full border-[#22d3ee] flex items-center justify-center bg-[#22d3ee]/10 glow-cyan">
                        <div className="w-8 h-8 rounded-full border border-[#22d3ee] border-b-transparent animate-spin"></div>
                    </div>
                    <div className="font-mono text-[#22d3ee] text-[10px] uppercase tracking-widest">RETRIEVING_BLOCKS...</div>
                </div>
            </SystemPanel>
        </div>
    );
}
