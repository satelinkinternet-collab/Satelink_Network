# SDK Integration Guide

Use Satelink RPC with your favorite Web3 library.

## JavaScript / TypeScript

### With ethers.js v6

```typescript
import { JsonRpcProvider } from 'ethers';

const provider = new JsonRpcProvider(
  'https://rpc.satelink.network/rpc/polygon',
  137,
  {
    staticNetwork: true,
    headers: {
      'X-API-Key': 'sk_free_abc123'
    }
  }
);

// Get block number
const blockNumber = await provider.getBlockNumber();
console.log('Block:', blockNumber);

// Get balance
const balance = await provider.getBalance('0x...');
console.log('Balance:', balance.toString());

// Call contract
const contract = new Contract(address, abi, provider);
const result = await contract.someMethod();
```

### With viem

```typescript
import { createPublicClient, http } from 'viem';
import { polygon } from 'viem/chains';

const client = createPublicClient({
  chain: polygon,
  transport: http('https://rpc.satelink.network/rpc/polygon', {
    fetchOptions: {
      headers: {
        'X-API-Key': 'sk_free_abc123'
      }
    }
  })
});

// Get block number
const blockNumber = await client.getBlockNumber();

// Get balance
const balance = await client.getBalance({
  address: '0x...'
});

// Read contract
const result = await client.readContract({
  address: '0x...',
  abi: contractAbi,
  functionName: 'balanceOf',
  args: ['0x...']
});
```

### With web3.js

```javascript
const Web3 = require('web3');

const web3 = new Web3(
  new Web3.providers.HttpProvider(
    'https://rpc.satelink.network/rpc/polygon',
    {
      headers: [{ name: 'X-API-Key', value: 'sk_free_abc123' }]
    }
  )
);

// Get block number
const blockNumber = await web3.eth.getBlockNumber();
console.log('Block:', blockNumber);
```

## Python

### With web3.py

```python
from web3 import Web3

w3 = Web3(Web3.HTTPProvider(
    'https://rpc.satelink.network/rpc/polygon',
    request_kwargs={
        'headers': {'X-API-Key': 'sk_free_abc123'}
    }
))

# Get block number
block = w3.eth.block_number
print(f"Block: {block}")

# Get balance
balance = w3.eth.get_balance('0x...')
print(f"Balance: {w3.from_wei(balance, 'ether')} MATIC")
```

## Rust

### With ethers-rs

```rust
use ethers::prelude::*;

#[tokio::main]
async fn main() {
    let provider = Provider::<Http>::try_from(
        "https://rpc.satelink.network/rpc/polygon"
    ).unwrap();
    
    // Note: Add X-API-Key header via custom HTTP client
    
    let block = provider.get_block_number().await.unwrap();
    println!("Block: {}", block);
}
```

## Go

### With go-ethereum

```go
package main

import (
    "context"
    "fmt"
    "github.com/ethereum/go-ethereum/ethclient"
)

func main() {
    client, err := ethclient.Dial("https://rpc.satelink.network/rpc/polygon")
    if err != nil {
        panic(err)
    }
    
    // Note: For API key, use custom HTTP transport
    
    block, _ := client.BlockNumber(context.Background())
    fmt.Printf("Block: %d\n", block)
}
```

## WebSocket Connection

For real-time subscriptions (newHeads, logs, pendingTransactions):

```typescript
import { WebSocketProvider } from 'ethers';

const wsProvider = new WebSocketProvider(
  'wss://rpc.satelink.network/rpc/ws/polygon'
);

// Subscribe to new blocks
wsProvider.on('block', (blockNumber) => {
  console.log('New block:', blockNumber);
});

// Subscribe to logs
wsProvider.on({ address: '0x...', topics: [] }, (log) => {
  console.log('Log:', log);
});
```

## Best Practices

### 1. Error Handling

```typescript
try {
  const result = await provider.call(tx);
} catch (error) {
  if (error.code === 429) {
    // Rate limited — implement backoff
    await sleep(1000);
    return retry();
  }
  throw error;
}
```

### 2. Connection Pooling

```typescript
// Reuse provider instance
const provider = new JsonRpcProvider(rpcUrl);

// Don't create new provider per request
async function getBalance(address: string) {
  return provider.getBalance(address);
}
```

### 3. Batch Requests

```typescript
// ethers.js doesn't support batching natively
// Use multicall for contract reads

import { Multicall } from 'ethereum-multicall';

const multicall = new Multicall({ ethersProvider: provider });
const results = await multicall.call(contractCallContext);
```

## Chain Configuration

Add to MetaMask or wallet:

| Field | Value |
|-------|-------|
| Network Name | Satelink Polygon |
| RPC URL | https://rpc.satelink.network/rpc/polygon |
| Chain ID | 137 |
| Currency | MATIC |
| Explorer | https://polygonscan.com |

## Support

- Dashboard: [app.satelink.network](https://app.satelink.network)
- API Status: [rpc.satelink.network/api/status](https://rpc.satelink.network/api/status)
- Email: support@satelink.network
