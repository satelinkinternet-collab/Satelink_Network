# Admin Control Room — Smoke Test Guide

All commands assume the backend runs at `http://localhost:8080` and the frontend at `http://localhost:3000`.

## 1. Mint Admin Token

```bash
ADMIN_TOKEN=$(curl -s -X POST http://localhost:8080/__test/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"wallet":"0xAdminSmoke"}' | node -pe 'JSON.parse(fs.readFileSync(0,"utf8")).token')

echo "Token: $ADMIN_TOKEN"
```

## 2. Command Center Summary

```bash
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:8080/admin/command/summary | node -pe 'JSON.stringify(JSON.parse(fs.readFileSync(0,"utf8")), null, 2)'
```

Expected: `{ ok: true, system: {...}, kpis: {...} }`

## 3. Live Feed

```bash
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:8080/admin/command/live-feed?limit=10 | node -pe 'JSON.parse(fs.readFileSync(0,"utf8")).feed.length'
```

## 4. Network Nodes

```bash
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:8080/admin/network/nodes?limit=5 | node -pe 'JSON.parse(fs.readFileSync(0,"utf8")).ok'
```

## 5. Ops Errors (trigger + verify)

```bash
# Trigger a test error
curl -s http://localhost:8080/__test/error 2>/dev/null || true
sleep 1

# Verify it appears
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:8080/admin/ops/errors | node -pe 'JSON.parse(fs.readFileSync(0,"utf8")).count'
```

## 6. Slow Queries

```bash
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:8080/admin/ops/slow-queries | node -pe 'JSON.parse(fs.readFileSync(0,"utf8")).ok'
```

## 7. Request Traces

```bash
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:8080/admin/ops/traces?limit=5 | node -pe 'JSON.parse(fs.readFileSync(0,"utf8")).ok'
```

## 8. Revenue Overview

```bash
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:8080/admin/revenue/overview | node -pe 'JSON.parse(fs.readFileSync(0,"utf8")).revenue_24h_usdt'
```

## 9. Security Alerts

```bash
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:8080/admin/security/alerts | node -pe 'JSON.parse(fs.readFileSync(0,"utf8")).ok'
```

## 10. Audit Log

```bash
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:8080/admin/security/audit | node -pe 'JSON.parse(fs.readFileSync(0,"utf8")).ok'
```

## 11. Feature Flags

```bash
# GET
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:8080/admin/settings/feature-flags | node -pe 'JSON.parse(fs.readFileSync(0,"utf8")).ok'

# SET
curl -s -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key":"test_flag","value":"1"}' \
  http://localhost:8080/admin/settings/feature-flags | node -pe 'JSON.parse(fs.readFileSync(0,"utf8")).ok'
```

## 12. Controls

```bash
# Pause Withdrawals
curl -s -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"paused":true}' \
  http://localhost:8080/admin/controls/pause-withdrawals | node -pe 'JSON.parse(fs.readFileSync(0,"utf8")).ok'
```

## 13. SSE Stream (5s)

```bash
curl --max-time 5 -N -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:8080/stream/admin 2>/dev/null || true
```

Expected: SSE events including `hello`, `snapshot`

## 14. RBAC — Readonly Denied

```bash
# Mint readonly token (adjust if __test/auth path differs)
RO_TOKEN=$(curl -s -X POST http://localhost:8080/__test/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"wallet":"0xReadonly","role":"admin_readonly"}' | node -pe 'JSON.parse(fs.readFileSync(0,"utf8")).token')

# Should return 403
curl -s -X POST -H "Authorization: Bearer $RO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"paused":true}' \
  http://localhost:8080/admin/controls/pause-withdrawals
```

Expected: `{ ok: false, error: "Admin ops role required" }`

## 15. UI Smoke (browser)

1. Open `http://localhost:3000/admin` → should redirect to `/admin/command-center`
2. Verify KPI cards, live feed, system controls render
3. Navigate all sub-pages via sidebar
4. Check responsive layout at 375px width
5. Verify SSE "Live" pill indicator
