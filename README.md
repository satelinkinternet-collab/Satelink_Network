# Satelink Network

**Decentralized Physical Infrastructure (DePIN) platform** — monetize idle hardware by routing real workloads through distributed nodes with automated USDT settlement on Polygon.

[![CI](https://github.com/satelinkinternet-collab/Satelink_Network/actions/workflows/ci.yml/badge.svg)](https://github.com/satelinkinternet-collab/Satelink_Network/actions)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## What is Satelink?

Satelink is an **autonomous economic protocol**. Machines, DeFi protocols, and AI agents consume network resources without human involvement. Revenue is machine-to-machine.

- **No sales funnels** — protocols integrate via API
- **No manual onboarding** — nodes self-register with pair codes
- **No invoicing** — per-call USDT metering with on-chain settlement

## Live Network

| Endpoint | URL | Status |
|----------|-----|--------|
| Public RPC | `https://rpc.satelink.network/rpc/amoy` | Live |
| API Status | `https://rpc.satelink.network/api/status` | Live |
| Dashboard | `https://satelink-dashboard.vercel.app` | Live |
| Website | `https://satelink.network` | Live |

## Quick Start

**For machines (JSON-RPC):**

```bash
curl -X POST https://rpc.satelink.network/rpc/amoy \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

**For developers (API key):**

```bash
# Get an API key
curl -X POST https://rpc.satelink.network/api/builder/keys \
  -H "Authorization: Bearer <jwt>"

# Use with higher rate limits
curl -X POST https://rpc.satelink.network/rpc/amoy \
  -H "x-api-key: sk_..."
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SATELINK NETWORK                         │
├─────────────┬─────────────┬─────────────┬──────────────────┤
│  RPC Layer  │  Billing    │   Epoch     │   Settlement     │
│  (Gateway)  │  (Metering) │  (Rewards)  │   (Polygon)      │
├─────────────┴─────────────┴─────────────┴──────────────────┤
│                     Node Network                            │
│        [Router] [VPS] [GPU] [Server] [IoT Device]          │
└─────────────────────────────────────────────────────────────┘
```

- **Node Layer** — distributed hardware (routers, VPS, GPUs)
- **RPC Gateway** — multi-chain JSON-RPC relay with load balancing
- **Billing Engine** — per-call USDT metering and API key management
- **Epoch System** — automated 60-second reward distribution cycles
- **Settlement** — on-chain anchoring to Polygon with merkle proofs

## Revenue Model

| Role | Share |
|------|-------|
| Node Operators | 50% |
| Platform Fee | 30% |
| Distribution Pool | 20% |

All settlement happens automatically in USDT on Polygon. No manual claims required above the 1 USDT minimum threshold.

## Supported Chains

| Chain | Endpoint | Chain ID | Status |
|-------|----------|----------|--------|
| Polygon Amoy | `/rpc/amoy` | 80002 | Live |
| Polygon | `/rpc/polygon` | 137 | Coming Soon |
| Ethereum | `/rpc/ethereum` | 1 | Coming Soon |
| Arbitrum | `/rpc/arbitrum` | 42161 | Coming Soon |
| Base | `/rpc/base` | 8453 | Coming Soon |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js 20, Express, TypeScript |
| Database | PostgreSQL, Redis |
| Frontend | Next.js 14, shadcn/ui, Tailwind |
| Contracts | Solidity, Foundry, OpenZeppelin |
| Blockchain | Polygon (USDT settlement) |
| Deploy | Railway (API), Vercel (Dashboard), Docker |

## Project Structure

```
├── src/                 # Backend services
│   ├── routes/          # Express API routes
│   ├── services/        # Core business logic
│   ├── middleware/      # Auth, billing, rate limiting
│   └── jobs/            # Epoch scheduler, treasury monitor
├── contracts/           # Solidity smart contracts
├── apps/web/            # Next.js dashboard
├── scripts/             # Deploy & CI tools
├── test/                # Unit & integration tests
└── docs/                # Architecture documentation
```

## Documentation

- [Integration Guide](docs/INTEGRATION_GUIDE.md) — API usage for developers
- [Architecture](docs/AUTONOMOUS_ECONOMIC_PROTOCOL.md) — System design deep-dive
- [Deploy to Polygon](docs/DEPLOY_POLYGON.md) — Smart contract deployment
- [Bootstrap Checklist](docs/BOOTSTRAP_CHECKLIST.md) — Production setup

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Environment Variables

Required for production:

```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=<64+ chars>
RPC_URL=https://polygon-rpc...
CHAIN_ID=137
TREASURY_ADDRESS=0x...
```

See `.env.example` for full list.

## Network Stats

- **Chain:** Polygon Amoy (testnet) → Polygon mainnet (Q3 2026)
- **Settlement:** USDT (ERC-20)
- **Epoch interval:** 60 seconds
- **Minimum claim:** 1 USDT
- **Rate limit (public):** 100 requests/day

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License — see [LICENSE](LICENSE) for details.

---

**Revenue first. Rewards second. Ops are the product. Nodes are the supply.**

[Website](https://satelink.network) · [Dashboard](https://satelink-dashboard.vercel.app) · [Docs](docs/)
