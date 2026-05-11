import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { SectionContainer } from "@/components/ui/SectionContainer";
import { ShieldAlert, Scale, ScrollText } from "lucide-react";

export default function LegalPage() {
    return (
        <MarketingLayout>
            <SectionContainer className="pt-32">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">Legal & Disclosures</h1>
                <p className="text-xl text-muted mb-16 max-w-3xl">
                    Terms of Service, Privacy Policy, and Risk Disclosures strictly governing the interaction with the Satelink Execution Engine.
                </p>

                <div className="grid md:grid-cols-3 gap-8 mb-20">
                    <div className="col-span-1 border-r border-zinc-800 pr-8">
                        <h2 className="text-2xl font-bold text-white mb-6">Directory</h2>
                        <ul className="space-y-4 text-zinc-400 font-medium">
                            <li className="hover:text-white cursor-pointer transition-colors">Terms of Service</li>
                            <li className="hover:text-white cursor-pointer transition-colors">Privacy Policy</li>
                            <li className="text-amber-500 hover:text-amber-400 cursor-pointer transition-colors">Risk Disclosure</li>
                            <li className="hover:text-white cursor-pointer transition-colors">Revenue Variability Disclaimer</li>
                            <li className="hover:text-white cursor-pointer transition-colors">Protocol License</li>
                        </ul>
                    </div>

                    <div className="col-span-2 space-y-12 pl-4">
                        <div className="space-y-4">
                            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                                <ScrollText className="w-6 h-6 text-zinc-500" />
                                Terms of Service
                            </h3>
                            <p className="text-zinc-400 leading-relaxed text-sm">
                                By accessing, browsing, interacting with the Satelink Network API, or deploying a Node Operator execution client, you agree to be bound by these Terms of Service. The protocol software is provided "as is", without warranty of any kind.
                            </p>
                            <p className="text-zinc-400 leading-relaxed text-sm">
                                Satelink reserves the programmatic right to algorithmically slash registered nodes that fail to adhere to cryptographic execution verifications. By registering
                                a public wallet address on the Satelink Node Registry, you authorize these decentralized state transitions.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                                <Scale className="w-6 h-6 text-zinc-500" />
                                Privacy Policy
                            </h3>
                            <p className="text-zinc-400 leading-relaxed text-sm">
                                Satelink infrastructure operators process enterprise payloads. By default, standard execution payloads are encrypted and operator nodes cannot inspect raw consumer data. However, public metadata including wallet routing addresses, uptime statistics, and processing history are perpetually stored on the ledger and are entirely public by design.
                            </p>
                        </div>

                        <div className="space-y-4 p-6 border border-amber-500/30 bg-amber-500/5 rounded-2xl">
                            <h3 className="text-2xl font-bold text-amber-500 flex items-center gap-2">
                                <ShieldAlert className="w-6 h-6 text-amber-500" />
                                Risk & Revenue Variability Disclaimer
                            </h3>
                            <p className="text-zinc-400 leading-relaxed text-sm">
                                The protocol does not guarantee fixed yields. Earnings from the Node Operator Pool (the 50% split) are exclusively predicated upon genuine enterprise request volume. If network volume decreases, yield will proportionally decrease.
                            </p>
                            <p className="text-zinc-400 leading-relaxed text-sm">
                                Purchasing and maintaining server infrastructure entails financial risk. Operators are solely responsible for calculating their own OpEx (Operating Expenses) relative to volatile cryptographic asset rewards. Under no circumstances will protocol developers reimburse operational losses due to jailing, slashing, or reduced protocol revenue.
                            </p>
                        </div>
                    </div>
                </div>
            </SectionContainer>
        </MarketingLayout>
    );
}
