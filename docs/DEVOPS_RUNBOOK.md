# Satelink API — DevOps Runbook

**Last Updated:** 2026-05-30  
**Author:** BACKEND_WORKER ([SAT-72](/SAT/issues/SAT-72))  
**Platform:** Railway (production) + Vercel (frontend)

---

## Table of Contents

1. [Service Overview](#service-overview)
2. [Scaling Configuration](#scaling-configuration)
3. [Log Observability](#log-observability)
4. [Rollback Procedure](#rollback-procedure)
5. [Incident Responses](#incident-responses)
6. [Production Health Checks](#production-health-checks)

---

## Service Overview

| Property          | Value                                                  |
|-------------------|--------------------------------------------------------|
| Platform          | Railway                                                |
| Project           | Satelink-api (`0312ce4a-fb7b-41be-b7c7-0d3dcfdc0f89`) |
| Service           | Satelink-api (`4cbbe717-13e4-48a8-b7bc-c1160c8d7dff`) |
| Environment       | production (`f06a4371-1c04-40be-890d-8aa38e492ad2`)   |
| Runtime           | Node.js 20 + Express (Railpack builder)                |
| Port              | 8080                                                   |
| Healthcheck       | `GET /health` → `{"ok":true,"server":"ok","db":"ok"}` |
| Production URL    | https://rpc.satelink.network                           |

---

## Scaling Configuration

### Current State (as of 2026-05-30)

```
numReplicas: 1 (fixed)
restartPolicyType: ON_FAILURE
restartPolicyMaxRetries: 10
healthcheckPath: /health
healthcheckTimeout: 30s
```

Configured via Railway GraphQL API in [SAT-72](/SAT/issues/SAT-72):
```bash
mutation {
  serviceInstanceUpdate(
    serviceId: "4cbbe717-13e4-48a8-b7bc-c1160c8d7dff"
    environmentId: "f06a4371-1c04-40be-890d-8aa38e492ad2"
    input: {
      healthcheckPath: "/health"
      numReplicas: 1
      restartPolicyType: ON_FAILURE
      restartPolicyMaxRetries: 10
    }
  )
}
```

### Horizontal Autoscaling (Requires Railway Pro Plan)

CPU-based autoscaling is a Railway Pro/Metal feature. The target configuration when the plan is upgraded:

| Parameter         | Value             |
|-------------------|-------------------|
| Min instances     | 1                 |
| Max instances     | 3                 |
| Scale-up trigger  | CPU > 70% for 60s |
| Scale-down trigger| CPU < 30% for 120s|

**To configure after Railway Pro upgrade:**
1. Go to Railway Dashboard → Satelink-api project → Satelink-api service
2. Navigate to Settings → Scaling
3. Enable "Autoscaling"
4. Set Min: 1, Max: 3
5. Set CPU scale-up threshold: 70%, window: 60s
6. Set CPU scale-down threshold: 30%, window: 120s

**CLI (once Railway Pro is active):**
```bash
railway scale --min-instances 1 --max-instances 3 \
  --scale-up-cpu 70 --scale-up-window 60 \
  --scale-down-cpu 30 --scale-down-window 120
```

Note: `railway scale` currently panics with a GraphQL schema error on the Hobby plan — this is expected Railway CLI behavior for non-Pro accounts.

### Manual Horizontal Scaling (Available Now)

To temporarily increase replicas during high traffic:
```bash
# Via Railway CLI
railway link --project 0312ce4a-fb7b-41be-b7c7-0d3dcfdc0f89
# Then via Railway Dashboard: Settings → Scaling → Replicas

# Via Railway GraphQL API (requires access token)
curl -X POST https://backboard.railway.app/graphql/v2 \
  -H "Authorization: Bearer $RAILWAY_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { serviceInstanceUpdate(serviceId: \"4cbbe717-13e4-48a8-b7bc-c1160c8d7dff\", environmentId: \"f06a4371-1c04-40be-890d-8aa38e492ad2\", input: { numReplicas: 2 }) }"}'
```

---

## Log Observability

### Railway Native Logs (Available Now)

Railway stores logs for all deployments. Access via:

```bash
# Stream live logs
railway logs

# Fetch last N lines
railway logs --lines 100

# HTTP request logs only
railway logs --http --lines 50

# Build logs
railway logs --build

# JSON format for processing
railway logs --json --lines 200
```

**Log types available:**
- Application logs (stdout/stderr) — `railway logs`
- HTTP access logs — `railway logs --http`
- Build/deploy logs — `railway logs --build`

### Setting Up Log Drains (External Observability)

Railway log drains are configured via the dashboard (no API support yet):

1. Go to Railway Dashboard → Satelink-api project → Settings → Log Drains
2. Choose provider: **BetterStack/Logtail** (recommended — Railway native integration)
3. Click "Add Log Drain" → Select "Logtail"
4. Paste your BetterStack source token (get from https://logs.betterstack.com)
5. Railway will begin forwarding all logs to BetterStack

**Alternative: Datadog**
1. Same path: Settings → Log Drains → Datadog
2. Paste Datadog API key and site (e.g., `datadoghq.com`)
3. Logs will appear in Datadog under `source:railway`

**Alternative: Generic HTTP drain**
```
Endpoint: https://your-observability-endpoint.com/logs
Headers: Authorization: Bearer <your-token>
```

### Verifying Log Ingestion

After setting up a drain, confirm with:
```bash
# Generate a test log entry
curl https://rpc.satelink.network/health

# Then verify in your observability tool that the /health request appears
# Expected Railway HTTP log entry:
# POST /health 200 12ms <request-id>
```

### Key Log Patterns to Monitor

| Pattern | Meaning | Action |
|---------|---------|--------|
| `[FreeTierGate] Free tier exceeded: ip=X` | IP hitting 500/day RPC limit | Normal — paid tier upgrade prompt shown |
| `error: ECONNREFUSED` | DB connection failed | Check DATABASE_URL, Railway Postgres health |
| `filter not found` (eth_getFilterChanges) | Expected blockchain filter error | Ignored (downgraded to DEBUG in SAT-56) |
| `healthy: false` in /health response | Service degraded | Page on-call immediately |
| HTTP 5xx spike | Application errors | Check logs for stack traces |

---

## Rollback Procedure

### Via Railway CLI (fastest)
```bash
# View recent deployments
railway deployment list

# Rollback to specific deployment
railway deployment rollback <deployment-id>

# Or rollback to most recent successful deployment
railway redeploy
```

### Via Railway Dashboard
1. Railway Dashboard → Satelink-api project → Deployments tab
2. Find the last known-good deployment
3. Click the "..." menu → "Rollback to this deployment"
4. Confirm the rollback (takes ~30-60s)

### Via Git (for code rollback)
```bash
# Find the good commit
git log --oneline -20

# Create hotfix branch from known-good commit
git checkout -b hotfix/rollback-<commit-hash> <commit-hash>

# Push to trigger Railway rebuild
git push origin hotfix/rollback-<commit-hash>

# In Railway Dashboard: link the new deployment to production
```

### Database Migration Rollback
```bash
# Connect to Railway Postgres
railway connect postgres

# Run the down migration
psql $DATABASE_URL -f migrations/down/<migration-name>.sql
```

---

## Incident Responses

### P0: Service Completely Down (HTTP 502/503)

1. **Verify**: `curl -s https://rpc.satelink.network/health`
2. **Check Railway status**: https://status.railway.app
3. **Check deployment health**: `railway logs --lines 50`
4. **If recent deploy broke it**: `railway deployment rollback <last-good-id>`
5. **If infrastructure issue**: Wait for Railway status update, or redeploy: `railway redeploy`
6. **Alert**: Post to Discord via `$DISCORD_WEBHOOK_URL`

### P1: Database Unreachable

Symptom: `/health` returns `{"ok":false,"db":"error"}`

1. Check Railway Postgres service health in the Railway Dashboard
2. Verify `DATABASE_URL` env var is set correctly: `railway variables | grep DATABASE_URL`
3. Try connecting: `railway connect postgres`
4. If Postgres service is crashed, restart it from the Railway Dashboard
5. If connection string changed, update `DATABASE_URL` variable

### P2: High CPU / Memory (Manual Scale-Up)

Until autoscaling is available on Pro plan:
1. Monitor Railway metrics dashboard for CPU/memory trends
2. Manually scale replicas to 2 or 3:
   ```bash
   curl -X POST https://backboard.railway.app/graphql/v2 \
     -H "Authorization: Bearer $RAILWAY_ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"query": "mutation { serviceInstanceUpdate(serviceId: \"4cbbe717-13e4-48a8-b7bc-c1160c8d7dff\", environmentId: \"f06a4371-1c04-40be-890d-8aa38e492ad2\", input: { numReplicas: 2 }) }"}'
   ```
3. Scale back down after traffic subsides: change `numReplicas: 1`

### P3: Free Tier Rate Limit Spike

Symptom: `[FreeTierGate] Free tier exceeded` flooding logs

This is **expected behavior** — IPs exceeding 500 RPC calls/day are sent a 402 upgrade prompt. Monitor for legitimate paying users being incorrectly blocked (should not happen unless billing logic has a bug).

1. Check if paid-tier users are affected: look for 402 on requests with valid `X-Wallet-Address` headers
2. If so, investigate billing middleware for async/await bugs (see active P0 issues in CLAUDE.md)

### P4: No Nodes Online

Symptom: `/api/status` returns `"nodes_online": 0`

This is currently **expected** — no node operators have registered yet.  
When first operators join: verify node registration flow and epoch pipeline are healthy.

---

## Production Health Checks

Run these to verify production status:

```bash
# Quick health check
curl -s https://rpc.satelink.network/health | python3 -m json.tool

# Operational status
curl -s https://rpc.satelink.network/api/status | python3 -m json.tool

# Test RPC passthrough (Polygon)
curl -s -X POST https://rpc.satelink.network/rpc/polygon \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

Expected healthy responses:
- `/health`: `{"ok":true,"server":"ok","db":"ok","uptime":<N>}`
- `/api/status`: `{"status":"operational","uptime_pct":99.5,...}`

Last verified production check (SAT-72, 2026-05-30T05:30:08Z):
- `/health`: `{"ok":true,"server":"ok","db":"ok","uptime":55603}`
- `/api/status`: `{"status":"operational","uptime_pct":99.5,"current_epoch":6668}`

---

## Environment Variables Reference

Required (hard-fail if missing):

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Min 64 chars. JWT signing key. |
| `DATABASE_URL` | Railway Postgres internal connection string |
| `REDIS_URL` | Redis connection string |
| `RPC_URL` | Polygon RPC endpoint |
| `TREASURY_ADDRESS` | USDT treasury wallet address |
| `CHAIN_ID` | `137` (mainnet) or `80002` (Amoy testnet) |

Optional (warnings if missing):

| Variable | Description |
|----------|-------------|
| `DISCORD_WEBHOOK_URL` | General alerts |
| `DISCORD_REVENUE_WEBHOOK_URL` | Revenue alerts |
| `SLACK_WEBHOOK_URL` | Slack notifications |
| `POLYGONSCAN_API_KEY` | Contract verification |

View current values: `railway variables`
