export default function ComputeNetworkPage() {
    return (
        <div className="max-w-4xl mx-auto space-y-16 pb-12">
            <header className="text-center pt-10">
                <div className="text-orange-500 font-bold uppercase tracking-wider mb-4">Product</div>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">Compute Network</h1>
                <p className="text-xl text-gray-400">
                    Deploy verifiable off-chain compute jobs and ZK proofs directly from your smart contracts.
                </p>
            </header>

            <section>
                <h2 className="text-2xl font-bold text-white mb-6 border-b border-[#1F2937] pb-2">Overview</h2>
                <p className="text-gray-300 leading-relaxed">
                    The Satelink Compute Network enables smart contracts to outsource heavy computation to a decentralized network of specialized nodes. Results are verified cryptographically using zero-knowledge proofs before being committed back to the blockchain, ensuring 100% security without gas limits.
                </p>
            </section>

            <section className="grid md:grid-cols-2 gap-8">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-6 border-b border-[#1F2937] pb-2">Use Cases</h2>
                    <ul className="space-y-4 text-gray-300">
                        <li className="flex items-start gap-3">
                            <span className="text-orange-500 mt-1">✓</span> Generating complex Zero-Knowledge Proofs for rollups.
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-orange-500 mt-1">✓</span> Running AI inference models off-chain with verified results.
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-orange-500 mt-1">✓</span> Processing large datasets for decentralized identity.
                        </li>
                    </ul>
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white mb-6 border-b border-[#1F2937] pb-2">Pricing</h2>
                    <div className="bg-[#111827] border border-[#1F2937] p-6 rounded-xl">
                        <div className="flex justify-between items-end mb-4">
                            <span className="text-gray-400">Pay-as-you-go</span>
                            <span className="text-2xl font-bold text-white">$0.005<span className="text-lg text-gray-500">/sec</span></span>
                        </div>
                        <ul className="text-sm text-gray-400 space-y-2">
                            <li>• Billing based on CPU/GPU cycles</li>
                            <li>• Access to high-end Nvidia A100s</li>
                            <li>• Sub-second scheduling latency</li>
                        </ul>
                    </div>
                </div>
            </section>

            <section>
                <h2 className="text-2xl font-bold text-white mb-6 border-b border-[#1F2937] pb-2">Architecture</h2>
                <div className="bg-[#111827] border border-[#1F2937] p-8 rounded-xl flex items-center justify-center">
                    <p className="text-gray-400 text-center">Smart Contract Request &rarr; Compute Marketplace &rarr; Off-chain Execution &rarr; ZK Verification &rarr; On-chain Callback</p>
                </div>
            </section>

            <section>
                <h2 className="text-2xl font-bold text-white mb-6 border-b border-[#1F2937] pb-2">API Example</h2>
                <div className="bg-[#0A0F1C] border border-[#1F2937] p-6 rounded-xl overflow-x-auto">
                    <pre className="text-sm font-mono text-gray-300">
                        <code>
                            {`// Solidity Example
import "@satelink/contracts/ComputeRequest.sol";

contract ImageGenerator is ComputeRequest {
    function generateImage(string memory prompt) public {
        bytes memory payload = abi.encode(prompt);
        
        // Request off-chain compute
        requestCompute(
            "satelink/stable-diffusion-vxl", 
            payload,
            this.handleComputeResult.selector
        );
    }
}`}
                        </code>
                    </pre>
                </div>
            </section>
        </div>
    );
}
