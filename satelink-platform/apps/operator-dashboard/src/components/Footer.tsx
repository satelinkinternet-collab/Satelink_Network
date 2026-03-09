import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="bg-[#111827] border-t border-[#1F2937] py-12 mt-16">
            <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">

                {/* Brand */}
                <div className="col-span-1 md:col-span-1">
                    <Link href="/" className="flex items-center gap-2 mb-4">
                        <div className="w-5 h-5 rounded bg-[#2563EB] flex items-center justify-center">
                            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                        </div>
                        <span className="font-semibold text-[#E5E7EB]">Satelink</span>
                    </Link>
                    <p className="text-sm text-[#9CA3AF] max-w-xs leading-relaxed">
                        Decentralized infrastructure network for RPC, compute, and machine APIs.
                    </p>
                </div>

                {/* Product Links */}
                <div>
                    <h4 className="text-sm font-semibold text-[#E5E7EB] mb-4">Products</h4>
                    <ul className="space-y-3">
                        <li><Link href="/products/rpc-gateway" className="text-sm text-[#9CA3AF] hover:text-[#2563EB] transition-colors">RPC Gateway</Link></li>
                        <li><Link href="/products/automation" className="text-sm text-[#9CA3AF] hover:text-[#2563EB] transition-colors">Automation Engine</Link></li>
                        <li><Link href="/products/compute-network" className="text-sm text-[#9CA3AF] hover:text-[#2563EB] transition-colors">Compute Network</Link></li>
                        <li><Link href="/products/event-webhooks" className="text-sm text-[#9CA3AF] hover:text-[#2563EB] transition-colors">Event Webhooks</Link></li>
                        <li><Link href="/products/protocol-routing" className="text-sm text-[#9CA3AF] hover:text-[#2563EB] transition-colors">Protocol Routing</Link></li>
                    </ul>
                </div>

                {/* Resources */}
                <div>
                    <h4 className="text-sm font-semibold text-[#E5E7EB] mb-4">Resources</h4>
                    <ul className="space-y-3">
                        <li><Link href="/developers" className="text-sm text-[#9CA3AF] hover:text-[#2563EB] transition-colors">Developers</Link></li>
                        <li><Link href="/docs" className="text-sm text-[#9CA3AF] hover:text-[#2563EB] transition-colors">Documentation</Link></li>
                        <li><Link href="/network" className="text-sm text-[#9CA3AF] hover:text-[#2563EB] transition-colors">Network Map</Link></li>
                        <li><Link href="/node-operators" className="text-sm text-[#9CA3AF] hover:text-[#2563EB] transition-colors">Node Operators</Link></li>
                    </ul>
                </div>

                {/* System Status */}
                <div className="bg-[#0F172A] border border-[#1F2937] p-5 rounded-lg flex flex-col justify-between h-full">
                    <div>
                        <h4 className="text-xs font-semibold text-[#9CA3AF] mb-3 uppercase tracking-wider">System Status</h4>
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            </span>
                            <span className="text-sm text-emerald-500 font-medium">All Systems Operational</span>
                        </div>
                    </div>
                    <p className="text-xs text-[#9CA3AF] mt-4">
                        &copy; {new Date().getFullYear()} Satelink, Inc.
                    </p>
                </div>
            </div>
        </footer>
    );
}
