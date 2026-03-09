export default function EventWebhooksPage() {
    return (
        <div className="max-w-4xl mx-auto space-y-16 pb-12">
            <header className="text-center pt-10">
                <div className="text-purple-500 font-bold uppercase tracking-wider mb-4">Product</div>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">Event Webhooks</h1>
                <p className="text-xl text-gray-400">
                    Real-time blockchain event notifications delivered reliably to your infrastructure.
                </p>
            </header>

            <section>
                <h2 className="text-2xl font-bold text-white mb-6 border-b border-[#1F2937] pb-2">Overview</h2>
                <p className="text-gray-300 leading-relaxed">
                    Stop polling the blockchain continuously. Satelink Event Webhooks allow you to subscribe to specific smart contract events, wallet transfers, or block mined events. Our system monitors all supported networks and pushes guaranteed at-least-once notifications to your HTTP endpoint exactly when it happens.
                </p>
            </section>

            <section className="grid md:grid-cols-2 gap-8">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-6 border-b border-[#1F2937] pb-2">Use Cases</h2>
                    <ul className="space-y-4 text-gray-300">
                        <li className="flex items-start gap-3">
                            <span className="text-purple-500 mt-1">✓</span> Notifying users of incoming deposits in real-time.
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-purple-500 mt-1">✓</span> Triggering off-chain fulfillment for on-chain purchases.
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-purple-500 mt-1">✓</span> Monitoring protocol health and governance proposals.
                        </li>
                    </ul>
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white mb-6 border-b border-[#1F2937] pb-2">Pricing</h2>
                    <div className="bg-[#111827] border border-[#1F2937] p-6 rounded-xl">
                        <div className="flex justify-between items-end mb-4">
                            <span className="text-gray-400">Developer Tier</span>
                            <span className="text-2xl font-bold text-white">$49<span className="text-lg text-gray-500">/mo</span></span>
                        </div>
                        <ul className="text-sm text-gray-400 space-y-2">
                            <li>• 10M Events Delivered / Mo</li>
                            <li>• Up to 50 active Webhook Listeners</li>
                            <li>• Automatic Retries & Dead-letter queue</li>
                        </ul>
                    </div>
                </div>
            </section>

            <section>
                <h2 className="text-2xl font-bold text-white mb-6 border-b border-[#1F2937] pb-2">Architecture</h2>
                <div className="bg-[#111827] border border-[#1F2937] p-8 rounded-xl flex items-center justify-center">
                    <p className="text-gray-400 text-center">Event Indexers &rarr; Filter Engine &rarr; Delivery Queue &rarr; Your HTTP Endpoint</p>
                </div>
            </section>

            <section>
                <h2 className="text-2xl font-bold text-white mb-6 border-b border-[#1F2937] pb-2">API Example</h2>
                <div className="bg-[#0A0F1C] border border-[#1F2937] p-6 rounded-xl overflow-x-auto">
                    <pre className="text-sm font-mono text-gray-300">
                        <code>
                            {`curl -X POST https://api.satelink.network/v1/webhooks \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "chain": "ethereum",
    "contract": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "event": "Transfer(address,address,uint256)",
    "target_url": "https://api.yourdomain.com/webhooks/usdt"
  }'`}
                        </code>
                    </pre>
                </div>
            </section>
        </div>
    );
}
