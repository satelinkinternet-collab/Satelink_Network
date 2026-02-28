import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { SectionContainer } from "@/components/ui/SectionContainer";
import { ArchitectureDiagram } from "@/components/animations/ArchitectureDiagram";

export default function HowItWorksPage() {
    return (
        <MarketingLayout>
            <SectionContainer className="pt-32 pb-12">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">How It Works</h1>
                <p className="text-xl text-muted mb-12 max-w-3xl">
                    A technical deep dive into the Satelink modular architecture and execution lifecycle.
                </p>

                <div className="mb-16">
                    <ArchitectureDiagram />
                </div>

                <div className="grid md:grid-cols-2 gap-8 mb-16">
                    <div className="p-8 bg-surface border border-border rounded-2xl">
                        <h2 className="text-2xl font-bold text-white mb-4">Node Layer</h2>
                        <p className="text-zinc-400 mb-4">
                            The foundation of the network. A globally distributed set of execution clients tasked with processing enterprise payloads, API requests, and data indexing tasks. Nodes must maintain high uptime and verifiable execution standards to remain in the active pool.
                        </p>
                        <ul className="list-disc list-inside text-zinc-500 text-sm space-y-2">
                            <li>Rust-compiled client binary</li>
                            <li>Cryptographic payload signing</li>
                            <li>Resource-based capability matching</li>
                        </ul>
                    </div>

                    <div className="p-8 bg-surface border border-border rounded-2xl">
                        <h2 className="text-2xl font-bold text-white mb-4">Execution Engine</h2>
                        <p className="text-zinc-400 mb-4">
                            The core API gateway and routing layer. It receives incoming enterprise workloads, verifies authorization, and orchestrates task distribution among the active Node Layer via advanced load balancing algorithms.
                        </p>
                        <ul className="list-disc list-inside text-zinc-500 text-sm space-y-2">
                            <li>High-throughput ingestion</li>
                            <li>Fault-tolerant task distribution</li>
                            <li>DDoS mitigation & Rate limiting</li>
                        </ul>
                    </div>

                    <div className="p-8 bg-surface border border-border rounded-2xl">
                        <h2 className="text-2xl font-bold text-white mb-4">Monitoring & Diagnostics</h2>
                        <p className="text-zinc-400 mb-4">
                            An independent observer system that continuously samples node performance. It validates the cryptographic signatures of processed payloads through the Heartbeat Pipeline, automatically flagging degraded nodes for removal.
                        </p>
                    </div>

                    <div className="p-8 bg-surface border border-border rounded-2xl">
                        <h2 className="text-2xl font-bold text-white mb-4">Settlement Adapter Registry</h2>
                        <p className="text-zinc-400 mb-4">
                            The modular ledger interface. It abstracts the complexity of blockchain settlement, allowing the Execution Engine to write finalized state transitions to any supported ledger (EVM, Solana, Celestia) or operate in off-chain simulated mode.
                        </p>
                    </div>
                </div>

                <div className="p-8 bg-card border border-border rounded-2xl">
                    <h2 className="text-2xl font-bold text-white mb-4 text-center">Revenue Distribution Engine</h2>
                    <p className="text-zinc-400 text-center max-w-2xl mx-auto mb-8">
                        At the end of every epoch, the Protocol Treasury triggers the Revenue Distribution Engine. It calculates the proportionate share for every active node based on successfully verified tasks, transferring 50% of protocol fees to the Claimable Pool.
                    </p>
                    <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-sm font-mono text-zinc-300">
                        <div className="px-4 py-2 border border-emerald-500/30 bg-emerald-500/10 rounded-lg text-emerald-400">Total Enterprise Fees</div>
                        <div className="text-zinc-600">→</div>
                        <div className="px-4 py-2 border border-blue-500/30 bg-blue-500/10 rounded-lg text-blue-400">Split Engine</div>
                        <div className="text-zinc-600">→</div>
                        <div className="px-4 py-2 border border-amber-500/30 bg-amber-500/10 rounded-lg text-amber-400">50% Node Operator Pool</div>
                    </div>
                </div>
            </SectionContainer>
        </MarketingLayout>
    );
}
