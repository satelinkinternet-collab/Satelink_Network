export default function RpcGatewayPage() {
    return (
        <div className="max-w-4xl mx-auto space-y-16 pb-12">
            <header className="text-center pt-10">
                <div className="text-blue-500 font-bold uppercase tracking-wider mb-4">Product</div>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">RPC Gateway</h1>
                <p className="text-xl text-gray-400">
                    High-performance API access to 25+ blockchain networks with automatic failover and load balancing.
                </p>
            </header>

            <section>
                <h2 className="text-2xl font-bold text-white mb-6 border-b border-[#1F2937] pb-2">Overview</h2>
                <p className="text-gray-300 leading-relaxed">
                    The Satelink RPC Gateway routes your requests to the optimal decentralized node in our network, ensuring the fastest response times and highest reliability. Unlike centralized RPC providers, our gateway uses cryptographic proofs to guarantee response integrity, eliminating tampered data and malicious nodes.
                </p>
            </section>

            <section className="grid md:grid-cols-2 gap-8">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-6 border-b border-[#1F2937] pb-2">Use Cases</h2>
                    <ul className="space-y-4 text-gray-300">
                        <li className="flex items-start gap-3">
                            <span className="text-blue-500 mt-1">✓</span> Submitting high-frequency transactions for DeFi.
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-blue-500 mt-1">✓</span> Querying historical blockchain state for analytics.
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-blue-500 mt-1">✓</span> Running indexing nodes without local node maintenance.
                        </li>
                    </ul>
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white mb-6 border-b border-[#1F2937] pb-2">Pricing</h2>
                    <div className="bg-[#111827] border border-[#1F2937] p-6 rounded-xl">
                        <div className="flex justify-between items-end mb-4">
                            <span className="text-gray-400">Standard Tier</span>
                            <span className="text-2xl font-bold text-white">$20<span className="text-lg text-gray-500">/mo</span></span>
                        </div>
                        <ul className="text-sm text-gray-400 space-y-2">
                            <li>• 10,000 requests per second</li>
                            <li>• Access to all 25+ supported chains</li>
                            <li>• SLA: 99.99% Uptime</li>
                        </ul>
                    </div>
                </div>
            </section>

            <section>
                <h2 className="text-2xl font-bold text-white mb-6 border-b border-[#1F2937] pb-2">Architecture</h2>
                <div className="bg-[#111827] border border-[#1F2937] p-8 rounded-xl flex items-center justify-center">
                    <p className="text-gray-400 text-center">Global Load Balancer &rarr; Regional Routing Hubs &rarr; Decentralized Node Fleet</p>
                </div>
            </section>

            <section>
                <h2 className="text-2xl font-bold text-white mb-6 border-b border-[#1F2937] pb-2">API Example</h2>
                <div className="bg-[#0A0F1C] border border-[#1F2937] p-6 rounded-xl overflow-x-auto">
                    <pre className="text-sm font-mono text-gray-300">
                        <code>
                            {`curl -X POST https://rpc.satelink.network/ethereum \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_blockNumber",
    "params": [],
    "id": 1
  }'`}
                        </code>
                    </pre>
                </div>
            </section>
        </div>
    );
}
