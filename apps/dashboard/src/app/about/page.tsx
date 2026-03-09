import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { SectionContainer } from "@/components/ui/SectionContainer";

export default function AboutPage() {
    return (
        <MarketingLayout>
            <SectionContainer className="pt-32">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-8">About Satelink</h1>
                <p className="text-xl text-muted mb-12 max-w-3xl">
                    We are rebuilding the infrastructure layer of decentralized networks to be sustainable, verifiable, and revenue-backed.
                </p>

                <div className="grid md:grid-cols-2 gap-12 mb-20">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-4">Vision</h2>
                        <p className="text-zinc-400 leading-relaxed">
                            To create a universally accessible infrastructure network where node operators are compensated directly by protocol revenue rather than inflationary emissions. We envision a future where decentralized computation is as reliable as enterprise cloud providers but fundamentally open and permissionless.
                        </p>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-4">Mission</h2>
                        <p className="text-zinc-400 leading-relaxed">
                            Build the most robust execution and settlement engine that allows anyone to deploy a node, verify workloads, and earn sustainable yield. We aim to eliminate the dependency on VC-subsidized tokenomics by offering real value creation from day one.
                        </p>
                    </div>
                </div>

                <div className="mb-20">
                    <h2 className="text-3xl font-bold text-white mb-8 border-b border-border pb-4">Infrastructure Philosophy</h2>
                    <div className="space-y-6">
                        <div className="p-6 bg-surface border border-border rounded-2xl">
                            <h3 className="text-xl font-semibold text-white mb-2">Revenue-First Economics</h3>
                            <p className="text-zinc-400 leading-relaxed">
                                Tokens should capture value from actual network usage. By algorithmically directing 50% of protocol fees to the Node Operator Pool, we ensure that operators are aligned with the long-term success of the network. There are no inflationary subsidies to mask unprofitable operations.
                            </p>
                        </div>
                        <div className="p-6 bg-surface border border-border rounded-2xl">
                            <h3 className="text-xl font-semibold text-white mb-2">Cryptography Over Trust</h3>
                            <p className="text-zinc-400 leading-relaxed">
                                "Trust, but verify" is inadequate. Our architecture enforces cryptographic verification for every state transition before settlement. The Settlement Adapter Registry ensures that EVM and modular ledgers can securely record finalized states without trusting the execution clients.
                            </p>
                        </div>
                    </div>
                </div>

                <div>
                    <h2 className="text-3xl font-bold text-white mb-8 border-b border-border pb-4">Long-Term Roadmap</h2>
                    <ul className="space-y-6 border-l border-zinc-800 ml-4 pl-8">
                        <li className="relative">
                            <span className="absolute -left-[41px] flex h-5 w-5 rounded-full bg-emerald-500 ring-4 ring-zinc-950" />
                            <h3 className="text-lg font-bold text-white mb-1">Phase 1: Foundation (Current)</h3>
                            <p className="text-zinc-400">Launch of the core execution engine, Node Operator Pool, and simulated settlement adapters. Establishing the 50/50 revenue split model.</p>
                        </li>
                        <li className="relative">
                            <span className="absolute -left-[41px] flex h-5 w-5 rounded-full bg-blue-500 ring-4 ring-zinc-950" />
                            <h3 className="text-lg font-bold text-white mb-1">Phase 2: Decentralization</h3>
                            <p className="text-zinc-400">Opening the network to permissionless node onboarding with active slashing mechanisms. Deployment of EVM-ready shadow settlement adapters.</p>
                        </li>
                        <li className="relative">
                            <span className="absolute -left-[41px] flex h-5 w-5 rounded-full bg-zinc-700 ring-4 ring-zinc-950" />
                            <h3 className="text-lg font-bold text-white mb-1">Phase 3: Scale & Governance</h3>
                            <p className="text-zinc-400">Full on-chain settlement integration, autonomous execution, and community-driven administration parameters.</p>
                        </li>
                    </ul>
                </div>
            </SectionContainer>
        </MarketingLayout>
    );
}
