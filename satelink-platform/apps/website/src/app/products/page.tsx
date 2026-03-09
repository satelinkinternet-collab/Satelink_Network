import ProductCards from '@/components/ProductCards';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function ProductsPage() {
    return (
        <div className="max-w-7xl mx-auto px-6 space-y-20 pb-20">

            <header className="text-center pt-16">
                <h1 className="text-4xl md:text-5xl font-bold text-[#E5E7EB] mb-6 tracking-tight">
                    Infrastructure Modules
                </h1>
                <p className="text-xl text-[#9CA3AF] max-w-2xl mx-auto leading-relaxed">
                    Select the required component for your decentralized architecture.
                </p>
            </header>

            <section>
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-[#E5E7EB] mb-2">Available Protocols</h2>
                    <p className="text-[#9CA3AF]">Core operational endpoints and APIs.</p>
                </div>

                <ProductCards />

                {/* Additional Products Row */}
                <div className="grid md:grid-cols-3 gap-6 pt-6">
                    <Link href="#">
                        <div className="bg-[#111827] border border-[#1F2937] hover:border-[#2563EB] transition-colors p-6 rounded-xl h-full flex flex-col group">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="font-semibold text-lg text-[#E5E7EB] group-hover:text-[#2563EB] transition-colors">
                                    Protocol Routing
                                </h3>
                                <ArrowRight className="w-5 h-5 text-[#9CA3AF] group-hover:text-[#2563EB] transition-colors" />
                            </div>
                            <p className="text-sm text-[#9CA3AF] mb-8 flex-grow leading-relaxed">
                                Intent-based transaction routing across isolated blockchains and rollups.
                            </p>
                            <div className="flex justify-between items-end border-t border-[#1F2937] pt-4 mt-auto">
                                <div>
                                    <div className="text-xs text-[#9CA3AF] mb-1">Latency</div>
                                    <div className="font-mono text-sm text-[#E5E7EB]">35ms</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-[#9CA3AF] mb-1">Status</div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                        <div className="text-sm text-[#E5E7EB]">Active</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Link>

                    <Link href="#">
                        <div className="bg-[#111827] border border-[#1F2937] hover:border-[#2563EB] transition-colors p-6 rounded-xl h-full flex flex-col group">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="font-semibold text-lg text-[#E5E7EB] group-hover:text-[#2563EB] transition-colors">
                                    Event Webhooks
                                </h3>
                                <ArrowRight className="w-5 h-5 text-[#9CA3AF] group-hover:text-[#2563EB] transition-colors" />
                            </div>
                            <p className="text-sm text-[#9CA3AF] mb-8 flex-grow leading-relaxed">
                                Real-time delivery of on-chain event streams to your backend services.
                            </p>
                            <div className="flex justify-between items-end border-t border-[#1F2937] pt-4 mt-auto">
                                <div>
                                    <div className="text-xs text-[#9CA3AF] mb-1">Delivery</div>
                                    <div className="font-mono text-sm text-[#E5E7EB]">99.98%</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-[#9CA3AF] mb-1">Status</div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                        <div className="text-sm text-[#E5E7EB]">Active</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Link>
                </div>
            </section>
        </div>
    );
}
