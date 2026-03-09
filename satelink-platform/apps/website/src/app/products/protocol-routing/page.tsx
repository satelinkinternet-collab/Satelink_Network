export default function ProtocolRoutingPage() {
    return (
        <div className="max-w-4xl mx-auto space-y-16 pb-12">
            <header className="text-center pt-10">
                <div className="text-indigo-500 font-bold uppercase tracking-wider mb-4">Product</div>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">Protocol Routing</h1>
                <p className="text-xl text-gray-400">
                    Intelligent transaction routing across bridges, DEXs, and interoperability protocols.
                </p>
            </header>

            <section>
                <h2 className="text-2xl font-bold text-white mb-6 border-b border-[#1F2937] pb-2">Overview</h2>
                <p className="text-gray-300 leading-relaxed">
                    Navigating cross-chain liquidity and execution is complex. Satelink Protocol Routing automatically finds the most efficient path for your multi-step transactions across dozens of supported DeFi protocols, bridges, and message passing systems.
                </p>
            </section>

            <section className="grid md:grid-cols-2 gap-8">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-6 border-b border-[#1F2937] pb-2">Use Cases</h2>
                    <ul className="space-y-4 text-gray-300">
                        <li className="flex items-start gap-3">
                            <span className="text-indigo-500 mt-1">✓</span> Cross-chain token swaps with minimal slippage.
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-indigo-500 mt-1">✓</span> Executing atomic multi-chain flash loans.
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-indigo-500 mt-1">✓</span> Abstracting bridging complexity from user interfaces.
                        </li>
                    </ul>
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white mb-6 border-b border-[#1F2937] pb-2">Pricing</h2>
                    <div className="bg-[#111827] border border-[#1F2937] p-6 rounded-xl">
                        <div className="flex justify-between items-end mb-4">
                            <span className="text-gray-400">Volume Base</span>
                            <span className="text-2xl font-bold text-white">0.05%<span className="text-lg text-gray-500"> fee</span></span>
                        </div>
                        <ul className="text-sm text-gray-400 space-y-2">
                            <li>• Zero upfront integration costs</li>
                            <li>• Automated MEV protection</li>
                            <li>• Gasless meta-transaction support</li>
                        </ul>
                    </div>
                </div>
            </section>

            <section>
                <h2 className="text-2xl font-bold text-white mb-6 border-b border-[#1F2937] pb-2">Architecture</h2>
                <div className="bg-[#111827] border border-[#1F2937] p-8 rounded-xl flex items-center justify-center">
                    <p className="text-gray-400 text-center">User Intent &rarr; Global Liquidity Graph &rarr; Path Optimization &rarr; Distributed Execution</p>
                </div>
            </section>

            <section>
                <h2 className="text-2xl font-bold text-white mb-6 border-b border-[#1F2937] pb-2">API Example</h2>
                <div className="bg-[#0A0F1C] border border-[#1F2937] p-6 rounded-xl overflow-x-auto">
                    <pre className="text-sm font-mono text-gray-300">
                        <code>
                            {`curl -X POST https://api.satelink.network/v1/routing/quote \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "source_chain": "ethereum",
    "target_chain": "arbitrum",
    "token_in": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "token_out": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    "amount_in": "1000000000"
  }'`}
                        </code>
                    </pre>
                </div>
            </section>
        </div>
    );
}
