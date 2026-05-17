# ContractsAgent
Scope: contracts/ only
Tools: forge, git, read, write
Role: Foundry tests, deploy scripts, ABI verification, gas optimization
Gate: Blocks deploy if any forge test fails
Rules:
  - All contracts must have AccessControl, Pausable, ReentrancyGuard where applicable
  - No mutable epoch rewrites
  - Target chain: Polygon (Amoy testnet → mainnet)
  - USDT is ERC-20 only — no ETH settlement
  - Run forge test -vvv before any deploy
  - Verify on Polygonscan after deploy
