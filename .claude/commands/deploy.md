# /deploy

Run the DEPLOY capability from .claude/skills/satelink/SKILL.md

Usage: /deploy [target]
  - /deploy backend  → Start local backend server
  - /deploy frontend → Deploy to Vercel production
  - /deploy contracts → Deploy smart contracts
  - /deploy (no args) → Show options

## Backend Deployment

```
1. PRE-FLIGHT
   - Run /audit (must PASS)
   - Verify .env has JWT_SECRET, DATABASE_URL, REDIS_URL

2. START SERVER
   source .env && node apps/api/server.js
   
   Wait for: "Satelink Backend Running"

3. SMOKE TEST
   curl http://localhost:8080/health
   curl -X POST http://localhost:8080/v1/workload/rpc/amoy \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

## Frontend Deployment (Vercel)

```
1. LOCAL BUILD FIRST
   cd apps/web && NODE_ENV=production npm run build
   
   Must complete without errors.

2. DEPLOY
   npx vercel --prod

3. SMOKE TEST
   curl -X POST https://satelink-dashboard.vercel.app/gateway/rpc/amoy \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

## Contract Deployment

```
1. TEST FIRST
   forge test -vv

2. DEPLOY
   node scripts/deploy-ethers.mjs --network amoy

3. VERIFY on Polygonscan
```

## Anti-patterns (REJECT)
- Deploying without local build test
- Skipping smoke tests
- Deploying with failing security gates
