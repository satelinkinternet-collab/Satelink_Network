import SystemPanel from '@/components/SystemPanel';

export default function ClaimsPage() {
    return (
        <div className="space-y-8 pb-12">
            <section className="flex justify-between items-end border-b border-[#1e3a8a] pb-6">
                <div>
                    <div className="font-mono text-[10px] text-[#ff7a00] uppercase tracking-widest mb-2 glow-orange">SYS_MODULE: SETTLEMENT_LAYER</div>
                    <h1 className="text-3xl font-['Orbitron'] font-bold text-white tracking-widest uppercase">Reward Claims</h1>
                </div>
                <button className="px-6 py-3 bg-[#00d9ff]/10 border border-[#00d9ff] text-[#00d9ff] hover:bg-[#00d9ff] hover:text-[#020617] font-mono text-[12px] font-bold uppercase tracking-widest transition-colors glow-blue">
                    EXECUTE_PAYLOAD
                </button>
            </section>

            <SystemPanel title="PENDING_SETTLEMENTS" glowColor="orange" className="min-h-[400px]">
                <div className="flex flex-col items-center justify-center h-full opacity-50 space-y-4">
                    <div className="w-16 h-16 border border-[#ff7a00] flex items-center justify-center bg-[#ff7a00]/10 glow-orange">
                        <div className="w-8 h-8 border border-[#ff7a00] animate-ping"></div>
                    </div>
                    <div className="font-mono text-[#ff7a00] text-[10px] uppercase tracking-widest">VERIFYING_SIGNATURES...</div>
                </div>
            </SystemPanel>
        </div>
    );
}
