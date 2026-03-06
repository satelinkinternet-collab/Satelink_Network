import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { SectionContainer } from "@/components/ui/SectionContainer";

export default function GovernancePage() {
    return (
        <MarketingLayout>
            <SectionContainer className="pt-32">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">Governance Architecture</h1>
                <p className="text-xl text-muted mb-12 max-w-3xl">
                    Decentralized parameter controls and rule enforcement for the Satelink Protocol.
                </p>

                <div className="grid md:grid-cols-2 gap-12 mb-20">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-6">Governance Controls</h2>
                        <p className="text-zinc-400 leading-relaxed mb-6">
                            The Satelink network utilizes a multi-signature governance module designed for gradual decentralization. During Phase 1, crucial economic variables and routing thresholds are controlled by protocol administrators to ensure network stability.
                        </p>
                        <ul className="space-y-4">
                            <li className="p-4 bg-surface border border-border rounded-xl">
                                <strong className="text-white block mb-1">Admin Economics Parameters</strong>
                                <span className="text-zinc-400 text-sm">Real-time control over the minimum base-fee adjustment, multiplier calculations for burst traffic, and the global treasury routing percentage.</span>
                            </li>
                            <li className="p-4 bg-surface border border-border rounded-xl">
                                <strong className="text-white block mb-1">Registry Whitelisting</strong>
                                <span className="text-zinc-400 text-sm">Approval algorithms for new Node Operators during the permissioned onboarding phases, ensuring enterprise-grade QoS before public mainnet ungate.</span>
                            </li>
                        </ul>
                    </div>

                    <div className="space-y-8">
                        <div className="p-8 bg-card border border-red-500/20 rounded-3xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                {/* Visual motif */}
                                <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="50" cy="50" r="45" stroke="#ef4444" strokeWidth="10" />
                                    <line x1="20" y1="20" x2="80" y2="80" stroke="#ef4444" strokeWidth="10" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-red-500 mb-4 relative z-10">Enforcement Rules</h2>
                            <p className="text-zinc-400 mb-6 relative z-10">
                                To guarantee verifiable computation, strictly enforced network integrity guidelines are required. Node Operators failing SLA requirements face automated protocol sanctions.
                            </p>

                            <div className="space-y-4 relative z-10">
                                <div className="flex gap-4">
                                    <div className="w-1.5 bg-amber-500 rounded-full shrink-0" />
                                    <div>
                                        <h4 className="text-white font-semibold">Jailing (Temporary Disqualification)</h4>
                                        <p className="text-zinc-500 text-sm mt-1">Triggered upon 3 consecutive missed Heartbeats or unresponsiveness exceeding 45 seconds. The node receives zero routing volume until an un-jail transaction is broadcasted.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-1.5 bg-red-500 rounded-full shrink-0" />
                                    <div>
                                        <h4 className="text-white font-semibold">Slashing (Protocol Excommunication)</h4>
                                        <p className="text-zinc-500 text-sm mt-1">Automatic revocation of registry status if a Node returns invalid payload signatures. All pending yield in the 48-day claim window is instantly aggregated into the Protocol Treasury.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </SectionContainer>
        </MarketingLayout>
    );
}
