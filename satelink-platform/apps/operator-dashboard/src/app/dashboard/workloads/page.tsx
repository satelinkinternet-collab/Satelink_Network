import SystemPanel from '@/components/SystemPanel';

export default function WorkloadsPage() {
    return (
        <div className="space-y-8 pb-12">
            <section className="flex justify-between items-end border-b border-[#1e3a8a] pb-6">
                <div>
                    <div className="font-mono text-[10px] text-[#ff7a00] uppercase tracking-widest mb-2 glow-orange">SYS_MODULE: EXECUTION_LAYER</div>
                    <h1 className="text-3xl font-['Orbitron'] font-bold text-white tracking-widest uppercase">Active Workloads</h1>
                </div>
            </section>

            <SystemPanel title="ACTIVE_SCHEDULER" glowColor="orange" className="min-h-[400px]">
                <div className="flex flex-col items-center justify-center h-full opacity-50 space-y-4">
                    <div className="w-16 h-16 border border-[#ff7a00] flex items-center justify-center bg-[#ff7a00]/10 glow-orange">
                        <div className="w-8 h-8 border border-[#ff7a00] animate-pulse"></div>
                    </div>
                    <div className="font-mono text-[#ff7a00] text-[10px] uppercase tracking-widest">AWAITING_TASKS...</div>
                </div>
            </SystemPanel>
        </div>
    );
}
