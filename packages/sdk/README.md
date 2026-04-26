# @satelink/sdk

Official SDK for the Satelink DePIN network — blockchain RPC, AI inference, and more.

## Install

```bash
npm install @satelink/sdk
# or
pnpm add @satelink/sdk
# or
yarn add @satelink/sdk
```

## Quick Start

```typescript
import { SatelinkRPC, SatelinkAI } from '@satelink/sdk';

// RPC calls (no API key needed for public tier)
const rpc = new SatelinkRPC({ chain: 'polygon' });
const blockNumber = await rpc.getBlockNumber();
console.log('Current block:', blockNumber);

// AI inference (API key required)
const ai = new SatelinkAI({ apiKey: 'sk_live_...' });
const response = await ai.chat([
  { role: 'user', content: 'Hello!' }
]);
console.log(response.choices[0].message.content);
```

## RPC Usage

```typescript
import { SatelinkRPC } from '@satelink/sdk';

const rpc = new SatelinkRPC({
  apiKey: 'sk_live_...', // optional for higher rate limits
  chain: 'ethereum' // ethereum, polygon, arbitrum, base, polygon-amoy
});

// Get block number
const block = await rpc.getBlockNumber();

// Get balance
const balance = await rpc.getBalance('0x742d35Cc6634C0532925a3b844Bc9e7595f7bA8f');

// Make contract call
const result = await rpc.call({
  to: '0x...',
  data: '0x...'
});

// Send signed transaction
const txHash = await rpc.sendRawTransaction('0x...');

// Raw JSON-RPC request
const logs = await rpc.request('eth_getLogs', [{
  fromBlock: '0x0',
  toBlock: 'latest',
  address: '0x...'
}]);
```

## AI Usage

```typescript
import { SatelinkAI } from '@satelink/sdk';

const ai = new SatelinkAI({ apiKey: 'sk_live_...' });

// Chat completion (OpenAI-compatible)
const chatResponse = await ai.chat([
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'What is DePIN?' }
], {
  model: 'gpt-4o', // or satelink-default, gpt-3.5-turbo
  max_tokens: 500
});

console.log(chatResponse.choices[0].message.content);

// Legacy completion
const text = await ai.complete('Explain blockchain in one sentence:');

// List available models
const models = await ai.models;
```

## EIP-1193 Provider

Use with any library that accepts EIP-1193 providers:

```typescript
import { createProvider } from '@satelink/sdk';

const provider = createProvider({
  chain: 'polygon',
  apiKey: 'sk_live_...'
});

// Use with ethers.js
import { BrowserProvider } from 'ethers';
const ethersProvider = new BrowserProvider(provider);

// Use with viem
import { createWalletClient, custom } from 'viem';
import { polygon } from 'viem/chains';

const client = createWalletClient({
  chain: polygon,
  transport: custom(provider)
});
```

## Supported Chains

| Chain | ID | Slug |
|-------|-----|------|
| Ethereum | 1 | `ethereum` |
| Polygon | 137 | `polygon` |
| Arbitrum | 42161 | `arbitrum` |
| Base | 8453 | `base` |
| Polygon Amoy | 80002 | `polygon-amoy` |

## Pricing

- **RPC calls**: $0.00003 USDT per call (varies by chain)
- **AI inference**: $0.000001 per input token, $0.000003 per output token
- **MEV relay**: $0.001 per transaction (10x standard)

## Links

- Website: https://satelink.network
- Documentation: https://rpc.satelink.network/openapi.json
- GitHub: https://github.com/satelinkinternet-collab/Satelink_Network

## License

MIT
