# Satelink Bootstrap Checklist

Step-by-step checklist to bring the network from zero to first external payout.

## Week 1 — Internal Bootstrap

### Infrastructure
- [x] PostgreSQL database running with all migrations applied
- [x] Redis cache running
- [x] API server running on port 8080
- [x] All 6 security gates passing (`npm run security:audit`)

### Node Registration
- [x] Node #1 registered: `node scripts/bootstrap/register_node1.js`
- [x] Verify: `SELECT count(*) FROM registered_nodes WHERE status='active'` → 5 nodes
- [x] RPC provider registered for Polygon Amoy (chain_id: 80002)

### Billing Fix (CRITICAL)
- [x] S0-007 billing middleware async bugs FIXED
- [x] All `db.query()` calls have `await` in billing middleware
- [x] Railway billing verified: 122+ events, $0.0366 USDT

### First Workload
- [x] Run seed workload: `node scripts/bootstrap/seed_first_workload.js`
- [x] revenue_events_v2: 1000+ rows
- [x] Total revenue: $0.05+ USDT

### First Epoch
- [x] Epochs 7-9 closed with real data
- [x] epoch_earnings table has entries
- [x] 50/30/20 split verified

## Week 2 — External Discovery

### Chainlist Registration (Testnet)
- [x] Submit PR to [Chainlist](https://github.com/DefiLlama/chainlist) — SUBMITTED April 19
- [x] PR title: "feat: Add Satelink RPC for Polygon Amoy (80002)"
- [x] Entry added to constants/extraRpcs.js
- [x] PR merged — DONE

### Chainlist Registration (Mainnet)
- [ ] Submit PR for Polygon Mainnet (137) — see [docs/chainlist_mainnet_pr.md](chainlist_mainnet_pr.md)
- [ ] PR title: "Add Satelink public RPC for Polygon Mainnet (137)"
- [ ] PR merged

### dRPC Registration
- [x] Register on [dRPC.org](https://drpc.org/partners) as provider — SUBMITTED April 19
- [ ] Partner onboarding complete (awaiting confirmation)

### Community Outreach
- [ ] Post to r/ethdev with public RPC URL
- [ ] Post title: "Free public Polygon Amoy RPC by Satelink DePIN — 100 req/day no key needed"
- [ ] Add to awesome-rpc GitHub list

## Week 3 — First External Traffic

### Monitoring
- [ ] First external RPC call appears in rpc_requests (client_id IS NULL)
- [ ] Query: 
  ```sql
  SELECT ip_hash, count(*), sum(cost_usdt) 
  FROM rpc_requests 
  WHERE client_id IS NULL 
  GROUP BY ip_hash 
  ORDER BY count DESC;
  ```
- [ ] First external revenue_event recorded

## Week 4-6 — First Payout

### Settlement
- [ ] Settlement batch created
- [ ] Polygon tx hash in settlement_batches table
- [ ] Verify: `SELECT tx_hash FROM settlement_batches WHERE status='confirmed' LIMIT 1`

### External Operator
- [ ] First external node operator onboards
- [ ] Their wallet receives USDT on Polygon
- [ ] Screenshot Polygon transaction as proof of concept

### Metrics Update
- [ ] Update PROGRESS.md with Phase 1 completion
- [ ] Revenue Readiness: 60%+
- [ ] Production Readiness: 50%+

---

## Success Metrics (Weekly Targets)

| Metric | Week 1 | Week 4 | Week 8 |
|--------|--------|--------|--------|
| Active nodes | 1 | 3 | 10 |
| Daily RPC calls | 100 (internal) | 1,000 (mixed) | 10,000 (external) |
| Daily revenue (USDT) | $0.003 | $0.30 | $3.00 |
| revenue_events rows | >0 | >1,000 | >10,000 |
| Polygon tx hashes | 0 | 1 | 4 |
| External clients | 0 | 1 | 5 |

---

## Machine Discovery Checklist

Machines (DeFi bots, AI agents, indexers) find Satelink autonomously via these registries:

### Registry Submissions (do once — autonomous forever)
- [x] Chainlist Amoy (80002): https://github.com/DefiLlama/chainlist — MERGED
- [ ] Chainlist Mainnet (137): see [docs/chainlist_mainnet_pr.md](chainlist_mainnet_pr.md)
- [x] dRPC provider: https://drpc.org/partners — SUBMITTED April 19
- [ ] Ankr community: https://www.ankr.com/rpc/
- [ ] Blast API: https://blastapi.io/
- [ ] awesome-rpc: https://github.com/arddluma/awesome-rpc

### Endpoint Verification (machines must pass these)
- [ ] `curl -X POST https://rpc.satelink.network/rpc/polygon` returns valid block number
- [ ] `curl -X POST https://rpc.satelink.network/rpc/137` returns valid block number (chain ID alias)
- [ ] `curl https://rpc.satelink.network/api/pricing` returns JSON (no auth)
- [ ] `curl https://rpc.satelink.network/api/status` returns JSON (no auth)
- [ ] `curl https://rpc.satelink.network/health` returns `{"status":"ok"}`

### Chainlist PR Format (for /rpc/polygon submission)
```json
{
  "name": "Satelink",
  "url": "https://rpc.satelink.network/rpc/polygon",
  "tracking": "none",
  "trackingDetails": "Satelink does not log wallet addresses or IP addresses"
}
```

---

*Last updated: May 2026*
