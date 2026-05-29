# DEPIN CONCEPTS FOR SATELINK
# Background knowledge for all agents working on Satelink.

---

## WHAT IS DEPIN

DePIN = Decentralized Physical Infrastructure Network.
Real-world hardware (routers, servers, GPUs) contributes compute/bandwidth.
Operators earn tokens or stablecoins for their contribution.
Platform earns revenue by selling access to the aggregate network.

Satelink is a DePIN for RPC infrastructure:
- Physical nodes: home routers, VPS servers, residential IPs
- Contribution: serving blockchain RPC calls
- Payment: USDT on Polygon, distributed each epoch

---

## WHAT IS AN RPC ENDPOINT

RPC = Remote Procedure Call. For blockchains, it means:
A URL you call to read blockchain state or submit transactions.
Example: eth_getBlockNumber, eth_sendRawTransaction, eth_call

Standard: EIP-1193 (Ethereum standard for provider interface)
Satelink implements: POST /rpc/polygon → routes to active node → returns result

Why it matters: Every DeFi protocol, wallet, and DEX needs RPC endpoints.
They pay providers like Infura, Alchemy, QuickNode.
Satelink competes by being cheaper and decentralized.

---

## WHAT IS MEV

MEV = Maximal Extractable Value.
DeFi bots submit transactions in specific order to profit from price movements.
MEV bots pay a premium for private RPC that doesn't expose their transactions publicly.
Private mempool relay = Satelink charges higher rate per MEV transaction.
This is the highest-revenue-per-call workload type.

---

## CHAINLIST IMPORTANCE

Chainlist (chainlist.org) is a directory of RPC endpoints for every blockchain.
Wallets like MetaMask and Rainbow auto-discover RPCs from Chainlist.
Protocols, bridges, and DEXs query Chainlist for available RPCs.
If Satelink is listed on Chainlist → machine-to-machine discovery is automatic.
This is why the Chainlist PR is the single highest-leverage pending action.
The docs are ready at docs/chainlist_mainnet_pr.md — only human GitHub action needed.

---

## POLYGON MAINNET CONTEXT

Network name: Polygon PoS
Chain ID: 137
Native token: MATIC (for gas)
USDT contract: 0xc2132D05D31c914a87C6611C10748AEb04B58e8F (Polygon USDT)
Block explorer: polygonscan.com

Satelink uses USDT for all payments (stablecoin = predictable revenue).
Gas fees for settlement paid in MATIC from treasury wallet.

---

## NETS SCORE EXPLAINED

NETS = Node Economic Trust Score. 0-100 composite score.
Higher score = more revenue share per epoch.

8 dimensions:
1. Uptime (is the node online?)
2. Latency (how fast does it respond?)
3. Reliability (does it return correct results?)
4. Revenue contribution (how many ops did it serve?)
5. Fraud history (any abuse flags?)
6. Consistency (stable performance over time?)
7. Geographic diversity (is this region underserved?)
8. Node age (longer-running nodes earn trust bonus)

NETS multiplier: score/100 applied to base revenue share.
Node at 90 NETS earns 90% of what a perfect node earns.
Scores decay 5%/week for inactive nodes.

---

## AUTONOMOUS ECONOMIC PROTOCOL (AEP)

Satelink = AEP, not just a DePIN node network.
Primary revenue model: machine-to-machine, zero human sales.
Revenue flows without human intervention:
  M2M client hits RPC → credits deducted → epoch closes → Merkle root on-chain → claims open

9 protocol layers must ALL reach DONE for full product completion.
Reference: docs/AUTONOMOUS_ECONOMIC_PROTOCOL.md

Anti-patterns (reject immediately if suggested):
- Human sales funnels
- Marketing campaigns
- Manual client onboarding
- Features that require human action to generate revenue
