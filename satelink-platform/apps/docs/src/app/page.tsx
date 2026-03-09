export default function DocsPage() {
  return (
    <article className="prose prose-invert prose-blue max-w-none">
      <h1 className="text-4xl font-bold text-white mb-2">Getting Started</h1>
      <p className="text-xl text-gray-400 mb-8 border-b border-[#1F2937] pb-8">
        Learn how to integrate with the Satelink Network, authenticate your applications, and use the core APIs.
      </p>

      <h2 className="text-2xl font-bold text-white mt-12 mb-4">Introduction</h2>
      <p className="text-gray-300 leading-relaxed mb-6">
        Satelink is a decentralized infrastructure layer that provides high-performance RPC endpoints, event webhooks, autonomous execution, and cross-chain routing. Instead of relying on centralized providers, our network is operated by thousands of independent node operators.
      </p>

      <div className="bg-[#111827] border-l-4 border-blue-500 p-4 rounded-r-lg mb-8">
        <p className="text-gray-300 font-medium m-0">
          <strong>Note:</strong> All APIs require an active API key, which can be generated for free in the <a href="#" className="text-blue-400 hover:underline">Developer Portal</a>.
        </p>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-4">Quick Start</h2>
      <p className="text-gray-300 mb-4">
        The easiest way to start interacting with the network is via our official SDKs.
      </p>

      <div className="bg-[#0A0F1C] border border-[#1F2937] rounded-xl overflow-hidden mb-8">
        <div className="flex border-b border-[#1F2937] bg-[#111827]">
          <button className="px-4 py-2 text-sm text-blue-400 border-b-2 border-blue-400 font-medium">npm</button>
          <button className="px-4 py-2 text-sm text-gray-500 hover:text-gray-300">yarn</button>
          <button className="px-4 py-2 text-sm text-gray-500 hover:text-gray-300">pnpm</button>
        </div>
        <div className="p-4">
          <pre className="text-sm font-mono text-gray-300">
            <code>npm install @satelink/sdk</code>
          </pre>
        </div>
      </div>

      <h3 className="text-xl font-bold text-white mt-8 mb-4">Initialize the Client</h3>
      <p className="text-gray-300 mb-4">
        Once installed, initialize the client with your API key and the target network.
      </p>

      <div className="bg-[#0A0F1C] border border-[#1F2937] p-4 rounded-xl mb-8 overflow-x-auto">
        <pre className="text-sm font-mono text-gray-300">
          <code className="language-typescript">
            {`import { Satelink } from '@satelink/sdk';

const client = new Satelink({
  apiKey: process.env.SATELINK_API_KEY,
  environment: 'production'
});

// Example: Fetching a block
const blockNumber = await client.rpc.ethereum.getBlockNumber();
console.log(\`Current block: \${blockNumber}\`);`}
          </code>
        </pre>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-4">Next Steps</h2>
      <div className="grid md:grid-cols-2 gap-4 not-prose">
        <a href="#" className="border border-[#1F2937] bg-[#111827] p-6 rounded-xl hover:border-blue-500/50 transition-colors">
          <h4 className="font-bold text-white mb-2">Explore the RPC API &rarr;</h4>
          <p className="text-sm text-gray-400">View exact parameters and response shapes for all 25+ supported chains.</p>
        </a>
        <a href="#" className="border border-[#1F2937] bg-[#111827] p-6 rounded-xl hover:border-blue-500/50 transition-colors">
          <h4 className="font-bold text-white mb-2">Webhooks Guide &rarr;</h4>
          <p className="text-sm text-gray-400">Learn how to subscribe to smart contract events in real-time.</p>
        </a>
      </div>
    </article>
  );
}
