import SystemPanel from '@/components/SystemPanel';

export default function EarningsPage() {
    return (
        <div className="space-y-8 pb-12">
            <section className="flex justify-between items-end border-b border-[#1e3a8a] pb-6">
                <div>
                    <div className="font-mono text-[10px] text-[#22d3ee] uppercase tracking-widest mb-2 glow-cyan">SYS_MODULE: REVENUE_ACCOUNTING</div>
                    <h1 className="text-3xl font-['Orbitron'] font-bold text-white tracking-widest uppercase">Earnings Ledger</h1>
                </div>
                <div className="text-right">
                    <div className="font-mono text-[10px] text-[#94a3b8] uppercase tracking-widest mb-1">TOTAL_ACCUMULATED</div>
                    <div className="font-['Orbitron'] text-2xl font-bold text-[#00d9ff] glow-blue">12,450.00 <span className="text-sm text-white">SAT</span></div>
                </div>
            </section>

            <SystemPanel title="YIELD_ANALYSIS" glowColor="blue" className="min-h-[400px]">
                <div className="flex flex-col items-center justify-center h-full opacity-50 space-y-4">
                    <div className="w-16 h-16 border border-[#00d9ff] flex items-center justify-center bg-[#00d9ff]/10 glow-blue">
                        <div className="w-8 h-8 border border-[#00d9ff] animate-pulse"></div>
                    </div>
                    <div className="font-mono text-[#00d9ff] text-[10px] uppercase tracking-widest">CALCULATING_YIELD_CURVE...</div>
                </div>
            </SystemPanel>
        </div>
    );
}
