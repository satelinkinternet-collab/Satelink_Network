export default function DocsPage() {
  return (
    <article className="prose prose-invert prose-blue max-w-none">
      <h1 className="text-4xl font-bold text-white mb-2">Satelink Network Documentation</h1>
      <p className="text-xl text-gray-400 mb-8 border-b border-[#1F2937] pb-8">
        Decentralized RPC infrastructure for machine economies. Zero-trust, pay-per-use, USDT settlement.
      </p>

      <h2 className="text-2xl font-bold text-white mt-12 mb-4" id="quick-start">Quick Start</h2>
      <p className="text-gray-300 leading-relaxed mb-6">
        Make your first RPC request in under 10 seconds — no API key required for the free tier.
      </p>

      <div className="bg-[#0A0F1C] border border-[#1F2937] rounded-xl overflow-hidden mb-8">
        <div className="flex border-b border-[#1F2937] bg-[#111827] px-4 py-2">
          <span className="text-sm text-gray-400">curl</span>
        </div>
        <div className="p-4 overflow-x-auto">
          <pre className="text-sm font-mono text-gray-300 whitespace-pre">
{`curl -X POST https://rpc.satelink.network/rpc/polygon \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'`}
          </pre>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-4" id="supported-chains">Supported Chains</h2>
      <div className="not-prose overflow-x-auto mb-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1F2937]">
              <th className="text-left py-2 text-gray-400">Chain</th>
              <th className="text-left py-2 text-gray-400">Chain ID</th>
              <th className="text-left py-2 text-gray-400">Endpoint</th>
            </tr>
          </thead>
          <tbody className="text-gray-300">
            <tr className="border-b border-[#1F2937]/50">
              <td className="py-2">Polygon Mainnet</td>
              <td className="py-2 font-mono">137</td>
              <td className="py-2 font-mono text-blue-400">https://rpc.satelink.network/rpc/polygon</td>
            </tr>
            <tr className="border-b border-[#1F2937]/50">
              <td className="py-2">Ethereum Mainnet</td>
              <td className="py-2 font-mono">1</td>
              <td className="py-2 font-mono text-blue-400">https://rpc.satelink.network/rpc/ethereum</td>
            </tr>
            <tr className="border-b border-[#1F2937]/50">
              <td className="py-2">Arbitrum One</td>
              <td className="py-2 font-mono">42161</td>
              <td className="py-2 font-mono text-blue-400">https://rpc.satelink.network/rpc/arbitrum</td>
            </tr>
            <tr className="border-b border-[#1F2937]/50">
              <td className="py-2">Base</td>
              <td className="py-2 font-mono">8453</td>
              <td className="py-2 font-mono text-blue-400">https://rpc.satelink.network/rpc/base</td>
            </tr>
            <tr>
              <td className="py-2">Polygon Amoy (Testnet)</td>
              <td className="py-2 font-mono">80002</td>
              <td className="py-2 font-mono text-blue-400">https://rpc.satelink.network/rpc/amoy</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-4" id="authentication">Authentication</h2>
      <p className="text-gray-300 mb-4">
        The free tier provides 1,000 requests/day without an API key. For higher limits:
      </p>
      <ul className="text-gray-300 space-y-2 mb-6">
        <li><strong>Free:</strong> 1,000 req/day — no key required</li>
        <li><strong>Basic:</strong> 50,000 req/day — $10/month</li>
        <li><strong>Pro:</strong> 500,000 req/day — $50/month</li>
        <li><strong>Enterprise:</strong> Unlimited — $200/month</li>
      </ul>
      <div className="bg-[#0A0F1C] border border-[#1F2937] rounded-xl p-4 mb-8">
        <pre className="text-sm font-mono text-gray-300">
{`curl -X POST https://rpc.satelink.network/rpc/polygon \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'`}
        </pre>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-4" id="rpc-methods">RPC Methods</h2>
      <p className="text-gray-300 mb-4">
        Standard JSON-RPC 2.0 interface. All Ethereum-compatible methods supported:
      </p>
      <div className="not-prose grid md:grid-cols-2 gap-4 mb-8">
        <div className="border border-[#1F2937] bg-[#111827] p-4 rounded-xl">
          <h4 className="font-bold text-white mb-2">State Queries</h4>
          <ul className="text-sm text-gray-400 space-y-1 font-mono">
            <li>eth_blockNumber</li>
            <li>eth_getBalance</li>
            <li>eth_getCode</li>
            <li>eth_getStorageAt</li>
            <li>eth_call</li>
          </ul>
        </div>
        <div className="border border-[#1F2937] bg-[#111827] p-4 rounded-xl">
          <h4 className="font-bold text-white mb-2">Transactions</h4>
          <ul className="text-sm text-gray-400 space-y-1 font-mono">
            <li>eth_sendRawTransaction</li>
            <li>eth_getTransactionReceipt</li>
            <li>eth_getTransactionByHash</li>
            <li>eth_estimateGas</li>
            <li>eth_gasPrice</li>
          </ul>
        </div>
      </div>
      <p className="text-gray-400 text-sm">
        Full pricing at: <a href="https://rpc.satelink.network/api/pricing" className="text-blue-400 hover:underline">https://rpc.satelink.network/api/pricing</a>
      </p>

      <h2 className="text-2xl font-bold text-white mt-12 mb-4" id="node-setup">Node Setup</h2>
      <p className="text-gray-300 mb-4">
        Run a node and earn 50% of revenue from requests routed through your infrastructure.
      </p>
      <ol className="text-gray-300 space-y-2 mb-6">
        <li>1. Install the Satelink Node Agent</li>
        <li>2. Register your node with a wallet address</li>
        <li>3. Start receiving traffic and earning USDT</li>
      </ol>
      <p className="text-gray-400 text-sm mb-8">
        Setup guide: <a href="https://satelink.network/node/setup" className="text-blue-400 hover:underline">satelink.network/node/setup</a>
      </p>

      <h2 className="text-2xl font-bold text-white mt-12 mb-4" id="settlement">Settlement Model</h2>
      <p className="text-gray-300 mb-4">
        Revenue settles automatically every 60 seconds on Polygon using USDT:
      </p>
      <ul className="text-gray-300 space-y-2 mb-6">
        <li><strong>50%</strong> — Node operators (distributed by reputation score)</li>
        <li><strong>30%</strong> — Platform infrastructure</li>
        <li><strong>20%</strong> — Distribution pool (rewards, grants)</li>
      </ul>
      <div className="bg-[#111827] border-l-4 border-blue-500 p-4 rounded-r-lg mb-8">
        <p className="text-gray-300 font-medium m-0">
          Claims are pull-based: generate a signature via <code className="text-blue-400">/api/nodes/:nodeId/claim</code> and submit it to the ClaimsContract on Polygon.
        </p>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-4" id="smart-contracts">Smart Contracts</h2>
      <p className="text-gray-300 mb-4">Deployed on Polygon PoS (Chain ID: 137):</p>
      <div className="not-prose overflow-x-auto mb-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1F2937]">
              <th className="text-left py-2 text-gray-400">Contract</th>
              <th className="text-left py-2 text-gray-400">Address</th>
            </tr>
          </thead>
          <tbody className="text-gray-300 font-mono">
            <tr className="border-b border-[#1F2937]/50">
              <td className="py-2">ClaimsContract</td>
              <td className="py-2 text-blue-400">
                <a href="https://polygonscan.com/address/0x6987921e2453f360e314e4424F6c2789F10a1CC9" target="_blank" rel="noopener noreferrer" className="hover:underline">
                  0x6987921e2453f360e314e4424F6c2789F10a1CC9
                </a>
              </td>
            </tr>
            <tr className="border-b border-[#1F2937]/50">
              <td className="py-2">NodeRegistryV2</td>
              <td className="py-2 text-blue-400">
                <a href="https://polygonscan.com/address/0x27D7320d5786D5B4B4dE8aAAC6cf62338ADeC037" target="_blank" rel="noopener noreferrer" className="hover:underline">
                  0x27D7320d5786D5B4B4dE8aAAC6cf62338ADeC037
                </a>
              </td>
            </tr>
            <tr className="border-b border-[#1F2937]/50">
              <td className="py-2">RevenueDistributor</td>
              <td className="py-2 text-blue-400">
                <a href="https://polygonscan.com/address/0x8a9CefBD801574806a634aF179f538ABB5926F5a" target="_blank" rel="noopener noreferrer" className="hover:underline">
                  0x8a9CefBD801574806a634aF179f538ABB5926F5a
                </a>
              </td>
            </tr>
            <tr>
              <td className="py-2">RevenueVault</td>
              <td className="py-2 text-blue-400">
                <a href="https://polygonscan.com/address/0xa77512B9255D504B3fD450037f1448D4df6A1b6d" target="_blank" rel="noopener noreferrer" className="hover:underline">
                  0xa77512B9255D504B3fD450037f1448D4df6A1b6d
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-4" id="sdk">SDK Installation</h2>
      <div className="bg-[#0A0F1C] border border-[#1F2937] rounded-xl overflow-hidden mb-8">
        <div className="flex border-b border-[#1F2937] bg-[#111827]">
          <button className="px-4 py-2 text-sm text-blue-400 border-b-2 border-blue-400 font-medium">npm</button>
          <button className="px-4 py-2 text-sm text-gray-500">yarn</button>
          <button className="px-4 py-2 text-sm text-gray-500">pnpm</button>
        </div>
        <div className="p-4">
          <pre className="text-sm font-mono text-gray-300">npm install @satelink/sdk</pre>
        </div>
      </div>

      <div className="bg-[#0A0F1C] border border-[#1F2937] p-4 rounded-xl mb-8 overflow-x-auto">
        <pre className="text-sm font-mono text-gray-300 whitespace-pre">
{`import { Satelink } from '@satelink/sdk';

const client = new Satelink({
  chain: 'polygon',
  apiKey: process.env.SATELINK_API_KEY // optional for free tier
});

const blockNumber = await client.rpc.getBlockNumber();
console.log('Current block:', blockNumber);`}
        </pre>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-4" id="status">API Status</h2>
      <p className="text-gray-300 mb-4">
        Monitor network health and check live metrics:
      </p>
      <ul className="text-gray-300 space-y-2 mb-8">
        <li><a href="https://rpc.satelink.network/api/status" className="text-blue-400 hover:underline">/api/status</a> — Network operational status</li>
        <li><a href="https://rpc.satelink.network/api/pricing" className="text-blue-400 hover:underline">/api/pricing</a> — Method pricing catalog</li>
        <li><a href="https://rpc.satelink.network/provider.json" className="text-blue-400 hover:underline">/provider.json</a> — Machine-readable metadata</li>
      </ul>
    </article>
  );
}
