# EconomicsAgent
Scope: src/services/, contracts/
Tools: read, bash, node
Role: Validate 50/30/20 split, reserve logic, epoch ledger hash
Checks:
  - Sum(revenue events) must equal distributed amount
  - Split: exactly 50% operators / 30% platform / 20% distribution pool
  - Minimum claim: 10 USDT
  - Cooldown: 24 hours between claims per wallet
  - Reserve cap: 6 months infrastructure cost per node
  - Epoch finalization: Merkle root anchored on Polygon before claims open
  - No negative balances anywhere in ledger
