# Satelink Production Checklist

Last updated: 2026-05-03

## Security

- [x] JWT_SECRET rotated and set in Railway
- [x] No debug routes exposed
- [x] token.txt purged from git history
- [x] Branch protection on main
- [x] 6 security gate scripts passing
- [x] RBAC middleware on admin routes
- [x] Rate limiting on public endpoints

## Infrastructure

- [x] Railway Hobby plan subscribed
- [x] PostgreSQL on Railway (production)
- [x] Redis TLS (Upstash)
- [x] Cloudflare DNS + DDoS protection
- [x] Custom domain rpc.satelink.network
- [x] SSL/TLS certificates active
- [x] Health monitoring (60s interval)

## Revenue

- [x] Billing pipeline confirmed (664+ events recorded)
- [x] Epoch auto-close running
- [x] 50/30/20 split logic in SplitEngine.sol
- [x] Revenue events v2 table schema stable
- [x] Merkle root anchoring implemented
- [x] USDT mainnet contract deployed (S9 blocker) — deployed 2026-05-04
- [x] MATIC balance > 1 (4.75 POL available)

## RPC Gateway

- [x] 6 chains supported (Polygon, Ethereum, Arbitrum, Base, Amoy, Solana)
- [x] 18+ providers configured
- [x] Latency-based routing
- [x] Circuit breaker failover
- [x] Redis caching (50%+ hit rate target)
- [x] WebSocket subscriptions
- [x] Chainlist integration merged

## Monitoring

- [x] Health monitor (60s)
- [x] Offline detector (2min)
- [x] Revenue anomaly detection
- [x] Treasury balance alerts
- [x] Discord alerts configured
- [x] Prometheus metrics endpoint

## API Endpoints

- [x] /rpc/:chain — JSON-RPC gateway
- [x] /rpc/metrics — performance metrics
- [x] /rpc/health — gateway health
- [x] /rpc/chains — supported chains
- [x] /api/keys/create — API key generation
- [x] /api/nodes — node registry
- [x] /api/settlement/history — epoch audit
- [x] /api/webhooks — webhook subscriptions
- [x] /api/oracle/price/:token — price feeds
- [x] /v1/chat/completions — AI gateway
- [x] /rpc/mev — MEV relay

## Launch Blockers

1. ~~**USDT contract on Polygon mainnet not deployed**~~ ✅ DEPLOYED
   - NodeRegistryV2: `0x27D7320d5786D5B4B4dE8aAAC6cf62338ADeC037`
   - RevenueDistributor: `0x8a9CefBD801574806a634aF179f538ABB5926F5a`
   - RevenueVault: `0xa77512B9255D504B3fD450037f1448D4df6A1b6d`
   - ClaimsContract: `0x6987921e2453f360e314e4424F6c2789F10a1CC9`

2. ~~**MATIC balance critically low (0.06)**~~ ✅ RESOLVED
   - Treasury has 4.75 POL, ~4.2 remaining after deployment

3. **API key rate limiting finalization**
   - Status: Basic limits in place
   - Action: Test under load

## Pre-Launch Final Steps

- [x] Run full security audit (all 6 scripts) — passed 2026-05-03
- [ ] Load test RPC endpoints (target: 5,000 req/s)
- [ ] Verify epoch close under high volume
- [ ] Test settlement batch flow end-to-end
- [x] Deploy contracts to Polygon mainnet — 2026-05-04
- [x] Top up MATIC balance — 4.75 POL available
- [ ] Enable production Discord alerts
- [ ] Publish API documentation
- [ ] Submit to additional chain registries

## Post-Launch Monitoring

- [ ] Watch error rates first 24h
- [ ] Monitor revenue events hourly
- [ ] Check circuit breaker trips
- [ ] Verify node operator payouts
- [ ] Track Chainlist traffic growth
