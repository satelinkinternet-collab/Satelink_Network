# Satelink Dashboard

Next.js 14 dashboard for node operators and developers to monitor earnings, claim USDT, and manage API keys.

## Live URLs

- **Production:** https://app.satelink.network
- **Development:** http://localhost:3000

## Key Pages

| Route | Purpose |
|-------|---------|
| `/satelink/os/overview` | Network stats, revenue metrics |
| `/satelink/os/withdraw` | Claim USDT earnings to wallet |
| `/satelink/os/plans` | API key tiers, deposit USDT |
| `/satelink/os/nodes` | Node operator dashboard |
| `/satelink/os/settings` | Wallet connection, preferences |

## Development

```bash
cd apps/web
npm install
npm run dev
```

Requires backend running at `http://localhost:8080`.

## Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_WS_URL=ws://localhost:8080
```

## Stack

- Next.js 14 (App Router)
- Tailwind CSS
- shadcn/ui components
- Recharts for analytics
- wagmi + viem for wallet connection

## Deployment

Auto-deploys to Vercel on push to `main` branch.
