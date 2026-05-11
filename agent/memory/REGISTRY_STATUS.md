# Satelink Registry Submissions

Last checked: 2026-05-07 16:45 UTC

## Active PRs

| Registry | PR | Status | Checks | URL |
|----------|-----|--------|--------|-----|
| Chainlist Amoy | #2665 | MERGED | - | https://github.com/DefiLlama/chainlist/pull/2665 |
| Chainlist Mainnet | #2721 | OPEN | validate: SUCCESS | https://github.com/DefiLlama/chainlist/pull/2721 |
| ethereum-lists | pending | NOT SUBMITTED | - | (submit after mainnet merge) |

## Other Registry Submissions

| Registry | Status | URL |
|----------|--------|-----|
| dRPC | SUBMITTED April 19 | https://drpc.org/partners |
| Ankr | NOT SUBMITTED | https://www.ankr.com/rpc/ |
| Blast API | NOT SUBMITTED | https://blastapi.io/ |
| awesome-rpc | NOT SUBMITTED | https://github.com/arddluma/awesome-rpc |

## Endpoints Verified Live

| Endpoint | Status | Notes |
|----------|--------|-------|
| https://rpc.satelink.network/rpc/polygon | working | Returns valid block number |
| https://rpc.satelink.network/rpc/137 | working | Chain ID alias (needs deploy) |
| https://rpc.satelink.network/api/status | working | Returns network stats |
| https://rpc.satelink.network/api/pricing | error | Needs Railway redeploy |
| https://rpc.satelink.network/health | working | Returns {"status":"ok"} |

## Expected Autonomous Traffic After Merges

### Chainlist Mainnet (#2721)
- DeFi bot discovery: 24-48h after merge
- Wallet integration: 48-72h after merge
- Expected daily calls: 1K-10K initial

### ethereum-lists (when submitted)
- Protocol integration: 48-72h after merge
- Wallet discovery: 72h-1 week after merge
- Expected daily calls: 500-5K initial

## Monitoring Commands

```bash
# Check Chainlist mainnet PR status
gh pr view 2721 --repo DefiLlama/chainlist --json state,reviews,statusCheckRollup

# Check all open PRs we've submitted
gh search prs --author=satelinkinternet-collab --state=open

# Verify RPC endpoint
curl -X POST https://rpc.satelink.network/rpc/polygon \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

---

*Auto-updated by agent. Manual edits may be overwritten.*
