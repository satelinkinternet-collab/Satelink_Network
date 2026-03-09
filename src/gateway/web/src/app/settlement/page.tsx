"use client";

import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { SectionContainer } from "@/components/ui/SectionContainer";
import { Layers, Zap, Hexagon, Database, Activity } from "lucide-react";
import { useSettlementMode } from "@/hooks/useSettlementMode";

export default function SettlementPage() {
    const { modeData, isLoading } = useSettlementMode();
    return (
        <MarketingLayout>
            <SectionContainer className="pt-32">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">Settlement Engine</h1>
                <div className="flex justify-between items-start mb-12">
                    <p className="text-xl text-muted max-w-3xl">
                        Modular, cryptographically secure validation and ledger recording for off-chain execution environments.
                    </p>
                    <div className="px-4 py-2 bg-surface border border-border rounded-full flex items-center gap-2">
                        <Activity className="w-4 h-4 text-zinc-400" />
                        <span className="text-sm font-medium text-white">Live Status:</span>
                        {isLoading ? (
                            <span className="text-sm text-zinc-400">Syncing...</span>
                        ) : (
                            <span className={`text-sm font-bold ${modeData?.mode === 'SIMULATED' ? 'text-amber-500' : modeData?.mode === 'SHADOW' ? 'text-blue-500' : 'text-emerald-500'}`}>
                                {modeData?.mode || 'OFFLINE'}
                            </span>
                        )}
                    </div>
                </div>

                {modeData?.mode === 'SIMULATED' && (
                    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 px-6 py-4 rounded-xl mb-12 text-sm">
                        <strong>Warning:</strong> The network is currently operating in Simulated Mode for Foundation Phase 1. Signatures are verified algorithmically without incurring external L1 gas costs.
                    </div>
                )}

                {modeData?.mode === 'EVM' && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-6 py-4 rounded-xl mb-12 text-sm flex justify-between items-center">
                        <div><strong>EVM Settlement Active:</strong> Connected to {modeData.chainName || 'Unknown Chain'}.</div>
                        <div className="font-mono text-xs opacity-80">{modeData.contractAddress}</div>
                    </div>
                )}

                {modeData?.mode === 'SHADOW' && (
                    <div className="bg-blue-500/10 border border-blue-500/20 text-blue-500 px-6 py-4 rounded-xl mb-12 text-sm flex justify-between items-center">
                        <div><strong>Shadow Settlement Active:</strong> Anchoring state roots.</div>
                        <div className="font-mono text-xs opacity-80">Ledger: {modeData.ledgerId}</div>
                    </div>
                )}

                <div className="grid md:grid-cols-2 gap-8 mb-20">
                    <div className="p-8 bg-surface border border-border rounded-3xl group transition-all hover:bg-zinc-900 border-l-4 border-l-amber-500">
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                            <Layers className="text-amber-500" />
                            Simulated Mode (Active)
                        </h2>
                        <p className="text-zinc-400 mb-4">
                            During the Phase 1 Foundation rollout, the Settlement Registry operates in Simulated Mode. Signatures from nodes are verified by the registry algorithmically without incurring external L1 gas costs.
                        </p>
                        <p className="text-zinc-500 text-sm">
                            * Used primarily for high-frequency internal enterprise logging and beta operator accounting.
                        </p>
                    </div>

                    <div className="p-8 bg-surface border border-border rounded-3xl group transition-all hover:bg-zinc-900 border-l-4 border-l-blue-500">
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                            <Zap className="text-blue-500" />
                            EVM-Ready Mode (Shadow Settlement)
                        </h2>
                        <p className="text-zinc-400 mb-4">
                            Select transaction batches are currently hashed and anchored to standard EVM testnets. We construct Merkle paths representing epoch state transitions, proving to on-chain smart contracts that execution was valid.
                        </p>
                        <p className="text-zinc-500 text-sm">
                            * Supports Arbitrum, Base, and OP Stack architectures.
                        </p>
                    </div>
                </div>

                <div className="mb-20">
                    <h2 className="text-3xl font-bold text-white mb-8 border-b border-border pb-4">Core Mechanism</h2>
                    <div className="grid md:grid-cols-2 gap-12">
                        <div>
                            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                <Hexagon className="text-emerald-400 w-5 h-5" />
                                Adapter Modularity
                            </h3>
                            <p className="text-zinc-400 leading-relaxed mb-6">
                                Satelink nodes never talk to the blockchain. Instead, the Execution Gateway batches cryptographic payload receipts and passes them to dynamically loaded Settlement Adapters. Adapters are responsible for specific data formatting (e.g. converting signatures to `ethers.js` transaction payloads).
                            </p>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                <Database className="text-blue-400 w-5 h-5" />
                                Ledger Recording Logic & Withdrawals
                            </h3>
                            <p className="text-zinc-400 leading-relaxed">
                                When an operator hits the "Claim" endpoint, the Settlement Engine calculates their proportional yield from the database. It then queries the protocol Treasury Smart Contract. A withdrawal is only processed if the treasury liquidity condition (`balance {'>'} requested`) allows it, ensuring complete collateral backing.
                            </p>
                        </div>
                    </div>
                </div>
            </SectionContainer>
        </MarketingLayout>
    );
}
