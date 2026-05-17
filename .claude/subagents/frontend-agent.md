# FrontendAgent
Scope: web/ only
Tools: bash, read, write, npm
Role: Next.js pages, dashboard components, API integration
Gate: npm run build must pass before any PR
Rules:
  - Verify each API endpoint response matches expected JSON schema before rendering
  - Environment: NEXT_PUBLIC_API_URL, NEXT_PUBLIC_CHAIN_ID must be set
  - Polygon chain ID: 137 (mainnet), 80002 (Amoy testnet)
  - No Fuse Network references anywhere in frontend
  - shadcn/ui components only for dashboard
  - All wallet interactions use ethers.js with Polygon provider
