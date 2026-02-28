import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { SectionContainer } from "@/components/ui/SectionContainer";

export default function DevelopersPage() {
    return (
        <MarketingLayout>
            <SectionContainer className="pt-32">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">Developer Hub</h1>
                <p className="text-xl text-muted mb-12 max-w-3xl">
                    Build the next generation of revenue-generating infrastructure. Everything you need to integrate, extend, and deploy on Satelink.
                </p>

                <div className="grid md:grid-cols-2 gap-12 mb-20">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-6">API Architecture</h2>
                        <div className="space-y-6">
                            <div className="p-6 bg-surface border border-border rounded-2xl">
                                <h3 className="text-lg font-bold text-blue-400 mb-2">Public APIs</h3>
                                <p className="text-zinc-400 text-sm mb-4">Unauthenticated endpoints for network statistics, node registry queries, and public ledger proofs.</p>
                                <code className="text-xs bg-black p-2 rounded text-zinc-300 border border-zinc-800">GET /api/v1/network/stats</code>
                            </div>
                            <div className="p-6 bg-surface border border-border rounded-2xl">
                                <h3 className="text-lg font-bold text-emerald-400 mb-2">Authenticated APIs</h3>
                                <p className="text-zinc-400 text-sm mb-4">Endpoints requiring Bearer JWT for enterprise workload submission and node operator management.</p>
                                <code className="text-xs bg-black p-2 rounded text-zinc-300 border border-zinc-800">POST /api/v1/compute/submit</code>
                            </div>
                            <div className="p-6 bg-surface border border-border rounded-2xl">
                                <h3 className="text-lg font-bold text-amber-400 mb-2">Admin APIs</h3>
                                <p className="text-zinc-400 text-sm mb-4">Strictly gated endpoints for governance tasks, parameter updates, and manual slashing overrides.</p>
                                <code className="text-xs bg-black p-2 rounded text-zinc-300 border border-zinc-800">POST /api/v1/admin/slash</code>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h2 className="text-2xl font-bold text-white mb-6">Settlement Adapter System</h2>
                        <p className="text-zinc-400 leading-relaxed mb-6">
                            Satelink uses a modular settlement architecture. Instead of hardcoding to a specific L1, developers can build Settlement Adapters. An adapter translates the internal finalized state transitions into the specific calldata required by the target ledger.
                        </p>
                        <div className="bg-[#0A0A0A] border border-zinc-800 rounded-xl p-6 font-mono text-sm text-zinc-300">
                            <span className="text-purple-400">interface</span> <span className="text-blue-400">ISettlementAdapter</span> {"{"}<br />
                            &nbsp;&nbsp;<span className="text-blue-400">name</span>(): <span className="text-amber-300">string</span>;<br />
                            &nbsp;&nbsp;<span className="text-blue-400">settle</span>(<span className="text-purple-400">payload</span>: <span className="text-amber-300">StateTransition</span>): <span className="text-blue-400">Promise</span>&lt;<span className="text-amber-300">TransactionReceipt</span>&gt;;<br />
                            &nbsp;&nbsp;<span className="text-blue-400">verify</span>(<span className="text-purple-400">txHash</span>: <span className="text-amber-300">string</span>): <span className="text-blue-400">Promise</span>&lt;<span className="text-amber-300">boolean</span>&gt;;<br />
                            {"}"}
                        </div>
                    </div>
                </div>

                <div className="mb-20">
                    <h2 className="text-3xl font-bold text-white mb-8 border-b border-border pb-4">Production Hardening Notes</h2>
                    <ul className="space-y-4 text-zinc-400">
                        <li className="flex items-center gap-3">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-xs text-white">1</span>
                            All deployment must be orchestrated via Docker Swarm or Kubernetes.
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-xs text-white">2</span>
                            Database connection pooling is mandatory for environments handling {">"}1,000 RPS.
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-xs text-white">3</span>
                            Rate limiters must be configured utilizing Redis cache to prevent volumetric attacks.
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-xs text-white">4</span>
                            Keys utilized for Heartbeat signing must be rotated every 30 epochs.
                        </li>
                    </ul>
                </div>

                <div className="p-8 bg-card border border-border rounded-3xl text-center">
                    <h2 className="text-2xl font-bold text-white mb-4">Contribution Model</h2>
                    <p className="text-zinc-400 max-w-2xl mx-auto mb-6">
                        The core protocol execution environment and standard settlement adapters are open source. We actively accept PRs for performance optimizations, newly supported ledgers, and improved documentation.
                    </p>
                    <a href="https://github.com/satelink-network/core" className="inline-block px-6 py-3 bg-white text-black font-semibold rounded-xl hover:bg-zinc-200 transition-colors">
                        View GitHub Repository
                    </a>
                </div>
            </SectionContainer>
        </MarketingLayout>
    );
}
