# /satelink-rpc-check
Pings all RPC providers (Polygon Amoy + mainnet) and reports latency.

Steps:
1. curl POST to https://rpc-amoy.polygon.technology with eth_blockNumber
2. curl POST to https://polygon-rpc.com with eth_blockNumber
3. curl POST to https://rpc.ankr.com/polygon_amoy with eth_blockNumber
4. Print: provider, latency ms, block number, pass/fail
5. Alert if any provider returns error or latency > 2000ms
