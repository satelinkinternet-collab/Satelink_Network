# Satelink Network Status

Public status page for the Satelink DePIN RPC Gateway infrastructure.

## Supported Chains

| Chain | Chain ID | Endpoint |
|-------|----------|----------|
| Polygon PoS | 137 | `https://rpc.satelink.network/rpc/polygon` |
| Ethereum | 1 | `https://rpc.satelink.network/rpc/ethereum` |
| Arbitrum One | 42161 | `https://rpc.satelink.network/rpc/arbitrum` |
| Base | 8453 | `https://rpc.satelink.network/rpc/base` |
| Polygon Amoy | 80002 | `https://rpc.satelink.network/rpc/amoy` |

## Public Endpoints

| Endpoint | Description |
|----------|-------------|
| `/health` | System health check with database status |
| `/api/status` | Live network metrics (nodes, requests, epochs) |
| `/api/pricing` | RPC method pricing catalog |
| `/provider.json` | Machine-readable provider metadata |
| `/rpc/health` | Provider-level health monitoring |
| `/rpc/chains` | Supported chains with configuration |

## Quick Start

```bash
# Check chain info
curl https://rpc.satelink.network/rpc/polygon

# Send JSON-RPC request
curl -X POST https://rpc.satelink.network/rpc/polygon \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Check health
curl https://rpc.satelink.network/health

# Get pricing
curl https://rpc.satelink.network/api/pricing
```

## Infrastructure Features

- **Multi-provider failover**: Automatic routing across 3-5 providers per chain
- **Latency-based routing**: Requests routed to fastest healthy provider
- **Edge caching**: Sub-millisecond responses for cacheable methods
- **Rate limiting**: Free tier (100 req/day), paid tiers available
- **Health monitoring**: 60-second provider health checks with Discord alerts
- **Revenue settlement**: USDT on Polygon with 50% node operator share

## Uptime & Failover

The Satelink RPC Gateway maintains 99.5%+ uptime through:

1. **Provider redundancy**: Multiple RPC providers per chain
2. **Circuit breakers**: Automatic provider isolation on failures
3. **Health monitoring**: Continuous provider health verification
4. **Automatic recovery**: Failed providers re-enabled after recovery

## Development

```bash
npm run dev    # Start status page locally
npm run build  # Build for production
```

## Links

- Website: https://satelink.network
- RPC Gateway: https://rpc.satelink.network
- Documentation: https://rpc.satelink.network/provider.json
