# Satelink Network — Smart Contracts

Solidity smart contracts powering the Satelink DePIN network.
Deployed on Polygon PoS (Chain ID: 137).

## Contracts

| Contract | Address (Polygon Mainnet) | Purpose |
|----------|--------------------------|---------|
| NodeRegistryV2 | TBD | On-chain node identity and registration |
| RevenueVault | TBD | USDT treasury holding contract with withdrawal caps |
| SplitEngine | TBD | 50/30/20 revenue split calculator |
| RevenueDistributor | TBD | USDT distribution to node/platform/builder pools |
| ClaimsContract | TBD | EIP-712 signed claim-to-payout lifecycle |
| ClaimsWithdrawals | TBD | Merkle-proof epoch claims with deadlines |
| EpochAnchor | TBD | On-chain epoch root anchoring (oracle) |
| EligibilityPolicy | TBD | Epoch scoring rules and eligibility thresholds |
| GovernanceTimelock | TBD | 24-hour timelock for governance operations |

## Economic Model

Revenue from paid operations is split on-chain:
- **50%** → Node Operator Pool
- **30%** → Platform Fee (core treasury)
- **20%** → Builder/Distribution Pool

The SplitEngine contract enforces this split with governance-controlled
basis points. No single party can modify the split unilaterally —
changes require CONFIGURATOR_ROLE and are subject to governance timelock.

### Revenue Flow

```
[Paid Ops] → RevenueVault → SplitEngine → RevenueDistributor
                                              ├── 50% → Node Operators
                                              ├── 30% → Core Treasury
                                              └── 20% → Builder Pool
```

### Claims Model

Node operators claim rewards using a **pull model**:
1. Platform computes epoch earnings off-chain
2. Merkle root is anchored on-chain via `EpochAnchor`
3. Operators submit claims with Merkle proofs via `ClaimsWithdrawals`
4. 48-day claim deadline enforced on-chain

## Development

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash && foundryup

# Install dependencies
forge install

# Build
forge build

# Test
forge test -vv

# Gas report
forge test --gas-report

# Deploy (testnet)
forge script script/Deploy.s.sol --rpc-url $POLYGON_AMOY_RPC --broadcast
```

## Security Features

- **AccessControl**: Role-based permissions (ADMIN, REGISTRAR, ORACLE, etc.)
- **Pausable**: Emergency pause on all critical contracts
- **ReentrancyGuard**: Protection against reentrancy attacks
- **Withdrawal Caps**: RevenueVault auto-pauses on cap breach
- **EIP-712 Signatures**: Typed signatures for claim verification
- **Merkle Proofs**: Trustless epoch claim verification
- **24h Timelock**: Governance operations require delay

## Audit Status

| Auditor | Date | Status | Report |
|---------|------|--------|--------|
| Pending | - | Scheduled | - |

## Security

Report vulnerabilities to: security@satelink.network

**Do NOT open public GitHub issues for security bugs.**

## License

MIT — see [LICENSE](./LICENSE)
