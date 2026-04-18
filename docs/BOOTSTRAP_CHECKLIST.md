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

### Chainlist Registration
- [ ] Submit PR to [Chainlist](https://github.com/DefiLlama/chainlist)
- [ ] PR title: "feat: Add Satelink RPC for Polygon Amoy (80002)"
- [ ] Entry format:
  ```javascript
  {
    url: "https://satelink-dashboard.vercel.app/gateway/rpc/amoy",
    tracking: "none",
  }
  ```
- [ ] See: docs/CHAINLIST_SUBMISSION.md for full PR template

### dRPC Registration
- [ ] Register on [dRPC.org](https://drpc.org/partners) as provider
- [ ] See: docs/DRPC_SUBMISSION.md for registration details

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

*Last updated: April 2026*
