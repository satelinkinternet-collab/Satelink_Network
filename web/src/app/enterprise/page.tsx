import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { SectionContainer } from "@/components/ui/SectionContainer";
import { CTAButton } from "@/components/ui/CTAButton";
import { ServerCog, ArrowRight, BookOpen, Layers } from "lucide-react";

export default function EnterprisePage() {
    return (
        <MarketingLayout>
            <SectionContainer className="pt-32">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">Enterprise Infrastructure</h1>
                <p className="text-xl text-muted mb-12 max-w-3xl">
                    White-label decentralized execution environments backed by strict verifiable computation mechanics.
                </p>

                <div className="grid md:grid-cols-2 gap-12 mb-20">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-6">Why Satelink?</h2>
                        <p className="text-zinc-400 leading-relaxed mb-6">
                            Enterprises require cryptographic guarantees over their computation, not just legal SLAs. Satelink provides a managed, white-label infrastructure layer built entirely around verifiable execution.
                        </p>
                        <ul className="space-y-6">
                            <li className="flex gap-4">
                                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                                    <ServerCog className="w-6 h-6 text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-1">White-Label Modules</h3>
                                    <p className="text-zinc-400 text-sm">Deploy private execution environments utilizing the Satelink Engine, entirely walled off from public payload execution.</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                                    <Layers className="text-emerald-400 w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-1">Flexible Settlement</h3>
                                    <p className="text-zinc-400 text-sm">Enterprise adapters allow settlement data to be written to any private SQL database or a consortium-based PoA ledger seamlessly.</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                                    <BookOpen className="text-amber-400 w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-1">API Integration</h3>
                                    <p className="text-zinc-400 text-sm">Full REST and gRPC API support. Drop-in replacement for traditional web2 execution lambdas without retraining internal DevOps staff.</p>
                                </div>
                            </li>
                        </ul>
                    </div>

                    <div className="p-10 bg-surface border border-border rounded-3xl flex flex-col justify-center gap-8 text-center h-full">
                        <h2 className="text-3xl font-bold text-white">Revenue-Backed Reliability</h2>
                        <p className="text-zinc-400 leading-relaxed max-w-sm mx-auto">
                            Our operators strictly depend on enterprise revenue, fully aligning their economic incentives with your required uptime.
                        </p>
                        <CTAButton href="mailto:enterprise@satelink.network" variant="primary" className="py-4 mx-auto w-full md:w-auto mt-4 px-10">
                            Contact Sales <ArrowRight className="w-5 h-5 ml-2" />
                        </CTAButton>
                    </div>
                </div>
            </SectionContainer>
        </MarketingLayout>
    );
}
