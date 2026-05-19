# CURRENT STATE — 2026-05-18

## STATUS: v1.0 COMPLETE. Focus on traffic growth.

## IMMEDIATE PRIORITIES (in order)
1. Chainlist #2721 merge — waiting for DefiLlama CI fix or admin approval
   - Code is correct, CI fails due to node:sqlite Node v20 vs v22 issue
   - Comment posted tagging @0xngmi @treeSea

2. Recover $4.93 USDT from old contract
   - Contract: 0xE475c53B88190FD2130dB1E37504991EFe283fb0
   - Deployer 0x3b324B334E1e8ec926310e6716C97A9aF43b667A has CLAIM_CREATOR_ROLE
   - Method: createClaim() → claimReward() → withdrawFunds() (calls vault)
   - Risk: vault may not have liquidity → 40% recovery probability

3. Test real $1 USDT deposit flow
   - Create free API key → send $9 USDT to treasury → paste TX hash
   - Verifies the complete metered → collected revenue loop

## KEY ENDPOINTS
- MAL: GET /api/admin/mal/diagnostics (X-Admin-Token header)
- Claim: POST /api/nodes/NODE-ap-south-1-a09becbb/claim
- Deposit: POST /api/keys/:key/deposit
- Discord: POST /api/admin/mal/notify (type: test/summary/alert)

## ACTIVE RAILWAY VARS
- CLAIMS_CONTRACT_ADDRESS: 0x6987921e...CC9
- DISCORD_ALERTS_ENABLED: true
- GROQ_API_KEY: set (L9 AI live)
- DISCORD_WEBHOOK_URL: set (system-alerts channel)
- DISCORD_REVENUE_WEBHOOK_URL: set (revenue-events channel)

## RULES
- Never fund ClaimsContract from personal wallet
- Always read contract source before mainnet deployment
- $40.19 settlement queue = METERED only (not real USDT)
- 1.43M calls = 6-day cumulative total
- Rate limiting: 200/day free, upgrade via /api/keys
