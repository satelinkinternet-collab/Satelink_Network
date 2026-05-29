# Security Policy

## Reporting a Vulnerability

**Do NOT open a public GitHub issue for security vulnerabilities.**

Email: security@satelink.network

Response time: 48 hours acknowledgement, 7 days for triage

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Your suggested fix (optional)

## Scope

### In scope:
- Smart contracts (NodeRegistryV2, SplitEngine, RevenueVault, RevenueDistributor, ClaimsContract, ClaimsWithdrawals, EpochAnchor, EligibilityPolicy, GovernanceTimelock)
- Node edge agent
- API authentication and authorization
- Settlement and claims flows
- Epoch anchoring and Merkle proof verification

### Out of scope:
- Social engineering attacks
- Issues requiring physical access
- Third-party dependencies (report to upstream)
- Issues in test/mock contracts (MockUSDT)
- Denial of service via gas limits (known blockchain limitation)

## Severity Classification

| Severity | Description | Example |
|----------|-------------|---------|
| Critical | Direct fund loss or theft | Unauthorized withdrawal from RevenueVault |
| High | Significant protocol disruption | Bypassing role-based access control |
| Medium | Limited impact or requires conditions | Front-running claim transactions |
| Low | Informational or minor issues | Gas optimization opportunities |

## Rewards

We do not currently have a formal bug bounty program.

Responsible disclosure will be acknowledged publicly (with your permission).

## Safe Harbor

We will not pursue legal action against security researchers who:
- Make a good faith effort to avoid privacy violations, destruction of data, and interruption of services
- Only interact with accounts you own or with explicit permission
- Do not exploit vulnerabilities beyond proof-of-concept
- Report vulnerabilities promptly and do not disclose publicly until patched

## Contact

- Security issues: security@satelink.network
- General inquiries: hello@satelink.network
- Discord: discord.gg/satelink
