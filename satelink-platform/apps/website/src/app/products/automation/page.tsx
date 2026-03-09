export default function AutomationPage() {
    return (
        <div className="max-w-4xl mx-auto space-y-16 pb-12">
            <header className="text-center pt-10">
                <div className="text-green-500 font-bold uppercase tracking-wider mb-4">Product</div>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">Automation Engine</h1>
                <p className="text-xl text-gray-400">
                    Run autonomous, conditions-based smart contract automation securely at scale.
                </p>
            </header>

            <section>
                <h2 className="text-2xl font-bold text-white mb-6 border-b border-[#1F2937] pb-2">Overview</h2>
                <p className="text-gray-300 leading-relaxed">
                    The Satelink Automation Engine is a decentralized network of execution agents that monitor on-chain state or time-based conditions and automatically trigger smart contract functions when conditions are met. Never worry about missed executions, stuck transactions, or gas spikes again.
                </p>
            </section>

            <section className="grid md:grid-cols-2 gap-8">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-6 border-b border-[#1F2937] pb-2">Use Cases</h2>
                    <ul className="space-y-4 text-gray-300">
                        <li className="flex items-start gap-3">
                            <span className="text-green-500 mt-1">✓</span> Liquidating undercollateralized DeFi positions.
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-green-500 mt-1">✓</span> Compounding yield automatically across protocols.
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="text-green-500 mt-1">✓</span> Distributing staking rewards on a fixed schedule.
                        </li>
                    </ul>
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white mb-6 border-b border-[#1F2937] pb-2">Pricing</h2>
                    <div className="bg-[#111827] border border-[#1F2937] p-6 rounded-xl">
                        <div className="flex justify-between items-end mb-4">
                            <span className="text-gray-400">Enterprise Tier</span>
                            <span className="text-2xl font-bold text-white">Custom</span>
                        </div>
                        <ul className="text-sm text-gray-400 space-y-2">
                            <li>• Base fee + Gas execution costs</li>
                            <li>• Priority mempool routing</li>
                            <li>• Custom trigger conditions via WebAssembly</li>
                        </ul>
                    </div>
                </div>
            </section>

            <section>
                <h2 className="text-2xl font-bold text-white mb-6 border-b border-[#1F2937] pb-2">Architecture</h2>
                <div className="bg-[#111827] border border-[#1F2937] p-8 rounded-xl flex items-center justify-center">
                    <p className="text-gray-400 text-center">Condition Evaluators &rarr; Consensus Network &rarr; Execution Agents &rarr; Blockchain</p>
                </div>
            </section>

            <section>
                <h2 className="text-2xl font-bold text-white mb-6 border-b border-[#1F2937] pb-2">API Example</h2>
                <div className="bg-[#0A0F1C] border border-[#1F2937] p-6 rounded-xl overflow-x-auto">
                    <pre className="text-sm font-mono text-gray-300">
                        <code>
                            {`// Register a new up-keep job
import { AutomationSDK } from "@satelink/sdk";

const client = new AutomationSDK(process.env.API_KEY);

await client.registerJob({
  contract: "0xYourContractAddress",
  function: "compoundYield()",
  condition: {
    type: "time",
    schedule: "0 0 * * *" // Daily at midnight
  },
  fundingSource: "0xYourWalletAddress"
});`}
                        </code>
                    </pre>
                </div>
            </section>
        </div>
    );
}
