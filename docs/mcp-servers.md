# Satelink MCP Servers

## Connected MCP Servers (Claude.ai)

| Server | URL | Purpose for Satelink |
|--------|-----|----------------------|
| GitHub | github.mcp.claude.com | Branch management, PR, CI status, issue tracking |
| Google Drive | drivemcp.googleapis.com | Architecture PDFs, execution plans, audit reports |
| Google Calendar | gcal.mcp.claude.com | Milestone scheduling (ICS import for stage deadlines) |
| Gmail | gmail.mcp.claude.com | Node operator notifications, investor updates |
| Vercel | mcp.vercel.com | Deploy frontend, manage env vars, preview deploys |
| Cloudflare | bindings.mcp.cloudflare.com | DNS, Workers, D1 (future), R2 storage |
| Context7 | mcp.context7.com | Live docs: Node.js, Solidity, Next.js, Foundry, ethers.js |
| Amplitude | mcp.amplitude.com | API usage analytics, developer call tracking |
| Figma | mcp.figma.com | Dashboard UI designs, component specs |

## Custom MCP Servers (To Build — Stage S6+)

### satelink-db-mcp
- Purpose: Claude Code reads live PostgreSQL state without raw SQL
- Queries: nodes, epochs, revenue events, treasury balance
- Used for: audit tasks, debugging sessions

### satelink-polygon-mcp
- Purpose: Wrap Polygon RPC — check contract state on-chain
- Queries: treasury balance, claim status, node registry
- Replaces: manual ethers.js calls during debugging

### satelink-redis-mcp
- Purpose: Inspect Redis queues, cache, rate limit counters
- Used for: debugging RPC gateway, epoch pipeline, sentinel

### satelink-ci-mcp
- Purpose: Query GitHub Actions status, trigger reruns, read logs
- Used for: CI debugging without leaving Claude Code session

## Context7 Libraries (Pre-load for Satelink)
- /vercel/next.js — Next.js app router, API routes
- /expressjs/express — Express routing, middleware
- /OpenZeppelin/openzeppelin-contracts — Solidity security patterns
- /ethers-io/ethers.js — Polygon wallet/contract interactions
- /redis/node-redis — Redis queue and cache patterns
- /brianc/node-postgres — PostgreSQL client patterns
- /foundry-rs/foundry — Forge testing docs
