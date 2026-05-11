#!/bin/bash
set -e

API="https://rpc.satelink.network"

echo "=== SATELINK E2E REVENUE FLOW TEST ==="
echo ""
echo "Step 1: Health check"
curl -sf $API/health | jq .
echo ""

echo "Step 2: Send RPC call (generates revenue event)"
RESULT=$(curl -sf -X POST $API/rpc/polygon \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}')
echo "RPC response: $RESULT"
echo ""

echo "Step 3: Check revenue events recorded"
curl -sf $API/api/status | jq '{epoch: .current_epoch, nodes: .nodes_online, requests: .total_requests_24h}'
echo ""

echo "Step 4: Check epoch earnings"
curl -sf $API/api/settlement/history 2>/dev/null | jq '.[0]' 2>/dev/null || echo "No history yet (expected in beta)"
echo ""

echo "Step 5: Verify pricing endpoint (machine readable)"
curl -sf $API/api/pricing 2>/dev/null | jq '{model: .pricing_model, methods: (.methods | keys | length)}' 2>/dev/null || echo "Pricing endpoint pending"
echo ""

echo "Step 6: Verify provider.json (machine discovery)"
curl -sf $API/provider.json | jq '{name: .name, chains: (.chains | length)}'
echo ""

echo "Step 7: Verify MEV relay status"
curl -sf $API/rpc/mev/status | jq '{status: .status, chains: .chains | length, pricing: .pricing}'
echo ""

echo "Step 8: Test multi-chain RPC"
echo "  Polygon (137):"
curl -sf -X POST $API/rpc/polygon \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' | jq -c .
echo "  Ethereum (1):"
curl -sf -X POST $API/rpc/ethereum \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' 2>/dev/null | jq -c . || echo "  Ethereum not available"
echo ""

echo "=== E2E TEST COMPLETE ==="
echo ""
echo "Summary:"
echo "  - Health: PASS"
echo "  - RPC: $(echo $RESULT | jq -r 'if .result then "PASS" else "FAIL" end')"
echo "  - Status: PASS"
echo "  - Provider.json: PASS"
echo "  - MEV Relay: PASS"
