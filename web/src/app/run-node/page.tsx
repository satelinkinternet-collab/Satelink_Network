import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { SectionContainer } from "@/components/ui/SectionContainer";
import { CTAButton } from "@/components/ui/CTAButton";
import { Server, Activity, ArrowRight, ShieldAlert, Cpu } from "lucide-react";

export default function RunNodePage() {
    return (
        <MarketingLayout>
            <SectionContainer className="pt-32">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">Run a Satelink Node</h1>
                <p className="text-xl text-muted mb-12 max-w-2xl">
                    Deploy an execution client, process verified workloads, and earn sustainable yield directly from protocol revenue.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 mb-16">
                    <CTAButton href="https://github.com/satelink-network/node" variant="primary">
                        View Deployment Guide <ArrowRight className="w-5 h-5 ml-2" />
                    </CTAButton>
                </div>

                <div className="grid md:grid-cols-2 gap-8 mb-20">
                    <div className="p-8 bg-surface border border-border rounded-2xl">
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                            <Server className="w-6 h-6 text-blue-400" />
                            Requirements
                        </h2>
                        <ul className="space-y-4 text-zinc-400">
                            <li className="flex items-start gap-2">
                                <div className="mt-1 w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                                <span><strong>CPU:</strong> 4+ Cores (ARM64 or x86_64)</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <div className="mt-1 w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                                <span><strong>RAM:</strong> 8GB+ DDR4/DDR5</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <div className="mt-1 w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                                <span><strong>Storage:</strong> 250GB+ NVMe SSD (High IOPS required)</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <div className="mt-1 w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                                <span><strong>Network:</strong> 1Gbps+ symmetric connection with static IP</span>
                            </li>
                        </ul>
                    </div>

                    <div className="p-8 bg-surface border border-border rounded-2xl">
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                            <Cpu className="w-6 h-6 text-emerald-400" />
                            Deployment Steps
                        </h2>
                        <div className="space-y-4 text-zinc-400 font-mono text-sm bg-[#0A0A0A] p-4 rounded-xl border border-zinc-800">
                            <p># 1. Pull the official Docker image</p>
                            <p className="text-emerald-400">docker pull satelink/node:latest</p>
                            <br />
                            <p># 2. Generate operator keys</p>
                            <p className="text-emerald-400">docker run satelink/node generate-keys</p>
                            <br />
                            <p># 3. Start the execution client</p>
                            <p className="text-emerald-400">docker run -d --env-file .env satelink/node start</p>
                        </div>
                    </div>
                </div>

                <div className="mb-20">
                    <h2 className="text-3xl font-bold text-white mb-8 border-b border-border pb-4">Operator Earnings Model</h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="p-6 bg-card border border-border rounded-xl">
                            <h3 className="text-lg font-bold text-white mb-2">1. Revenue Split</h3>
                            <p className="text-zinc-400 text-sm">Every enterprise request processed by the network generates a fee in USDC/ETH. 50% of this fee is immediately routed to the Node Operator Pool.</p>
                        </div>
                        <div className="p-6 bg-card border border-border rounded-xl">
                            <h3 className="text-lg font-bold text-white mb-2">2. Pool Logic</h3>
                            <p className="text-zinc-400 text-sm">At the end of the settlement epoch, the pool is distributed proportionally based on the number of verified tasks your node successfully processed.</p>
                        </div>
                        <div className="p-6 bg-card border border-border rounded-xl">
                            <h3 className="text-lg font-bold text-white mb-2">3. Claim Flow</h3>
                            <p className="text-zinc-400 text-sm">Operators can claim their yield via the CLI or Dashboard dashboard. There is a standard 48-day claim window after which unclaimed yield rolls over.</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-4">
                    <ShieldAlert className="w-8 h-8 text-amber-500 shrink-0" />
                    <div>
                        <h3 className="text-lg font-bold text-amber-500 mb-2">Risk Disclosure</h3>
                        <p className="text-zinc-400 text-sm leading-relaxed">
                            Running a node involves operational risks and infrastructure costs. The Satelink Protocol does not guarantee fixed returns; earnings are entirely dependent on actual network usage and enterprise volume. Nodes that fail to meet uptime requirements or provide invalid cryptographic signatures will be subject to temporary disqualification (jailing) or permanent slashing.
                        </p>
                    </div>
                </div>
            </SectionContainer>
        </MarketingLayout>
    );
}
