# Beta Smoke Test Checklist

**Goal:** Verify critical paths before deploying Satelink Beta.
**Environment:** Localhost (Development) / Staging

## 1. Backend Setup

### Start Server
```bash
# Terminal 1
node server.js
# Verify it's running
curl http://localhost:8080/health
```

### Mint Admin Token
```bash
# Mint a Super Admin token
export ADMIN_TOKEN=$(curl -s -X POST http://localhost:8080/auth/__test/auth/login \
  -H "Content-Type: application/json" \
  -d '{"wallet":"0xadmin", "role":"admin_super"}' \
  | node -pe 'JSON.parse(fs.readFileSync(0,"utf8")).token')

echo "Token: $ADMIN_TOKEN"
```

### Verify Core API
```bash
# Should return user profile
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:8080/me

# Should return empty or list (non-error)
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:8080/admin/users
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:8080/admin/nodes
```

### Seed Demo Data (Dev Only)
```bash
# Populate Users
curl -X POST http://localhost:8080/__test/seed/admin

# Populate Nodes
curl -X POST http://localhost:8080/__test/seed/nodes
```

## 2. Frontend Verification

### Start Web
```bash
# Terminal 2
cd web
npm run dev
# Open http://localhost:3000
```

### Admin Flow
1. **Login**: Go to `/login`, select `Super Admin`.
2. **Users**: Page should show list of users (0xadmin, 0xnode, etc).
3. **Nodes**: Page should show ~3 nodes (online/offline). Use "Seed Demo Nodes" if empty.

### Node Operator Flow (Pairing)
1. **Login**: Go to `/login`, select `Node Operator`.
2. **Dashboard**: Should see "Offline" status and "Connect Device" card.
3. **Generate Code**: Click "Generate Pair Code".
4. **Simulate**: Copy code -> Open terminal, or click "Simulate Device Connection" (Dev only).
5. **Verify**: Dashboard should update to "Online" (might need refresh or wait for SSE).

### Builder Flow
1. **Login**: Select `Builder`.
2. **Stats**: Check operational spend and API keys.

### Distributor Flow
1. **Login**: Select `Distributor`.
2. **Stats**: Check referrals table and referral link.

## 3. Deployment Check
- [ ] `NODE_ENV=production` set on server.
- [ ] `NEXT_PUBLIC_API_BASE_URL` points to prod API.
- [ ] `DATABASE_URL` uses Postgres (not SQLite).
- [ ] Seed endpoints (`/__test/*`) return 404.
