# Earnings calculator

Estimate monthly revenue, costs, and payback period before you run a Satelink node.

The calculator at [app.satelink.network/calculator](https://app.satelink.network/calculator) models what a node operator can expect to earn based on hardware, performance, workload mix, and reputation.

## When to use the calculator

Use it before you:

- Choose hardware (residential server, VPS, data center, or GPU box).
- Commit to a node-count strategy (one beefy node vs. several smaller ones).
- Decide which workload mix to opt into (RPC, AI inference, webhooks).
- Forecast payback period for hardware and hosting costs.

If you already operate a node and want to compare against historical revenue, see the [Node Operator Guide](./node-operators).

## How earnings are calculated

The calculator uses the same revenue model that Satelink applies on-chain. The key inputs are:

| Input | Description | Effect on earnings |
|---|---|---|
| **Node type** | Residential, VPS, data center, or GPU. | Multiplier from `1.0×` (residential) up to `3.0×` (GPU). |
| **Hardware** | CPU cores, RAM, bandwidth. | Scales the request volume your node can serve. |
| **Workload mix** | % split between RPC, AI, and webhook traffic. | AI pays `2.5×` and webhooks `1.2×` the base RPC rate. |
| **Uptime** | Monthly availability %. | `+20%` at ≥99.5%, down to `-40%` below 95%. |
| **Latency** | Average response time in ms. | `+15%` at ≤50 ms, down to `-25%` above 200 ms. |
| **Success rate** | % of requests served without error. | `+10%` at ≥99.9%, down to `-30%` below 98%. |
| **Reputation score** | On-chain reputation (0–1000). | Multiplier from `0.6×` to `1.4×`. |
| **Bonuses** | Early adopter, uptime streak, geo diversity. | Up to `+20%` combined. |

### Base assumptions

The default earnings projection assumes:

- **2.5M requests/month** as the baseline volume per node.
- **$0.00004 per request** as the average paid rate (after method-weighting).
- **50% revenue share** to the node operator. Satelink retains 50% to cover infrastructure, settlement gas, and the treasury.
- **Reputation penalties** of `-25%` below score 300 and `-10%` below 500.

## Reading the results

The calculator returns the following figures per month:

- **Gross revenue** — what the network bills end users for traffic your node served.
- **Node share** — your 50% cut before bonuses and penalties.
- **Bonuses** — early-adopter, uptime-streak, and geo-diversity rewards.
- **Penalties** — reputation-based slashing of your node share.
- **Net earnings** — payout in USDT after bonuses and penalties.
- **Estimated costs** — hardware, bandwidth, and hosting based on node type.
- **Net profit** — net earnings minus costs.
- **Payback months** — how long until you recoup your initial hardware investment (estimated at 2× monthly costs).

## Example: VPS operator

A typical VPS configuration with the following inputs:

```text
Node type:        VPS
CPU cores:        4
RAM:              8 GB
Bandwidth:        1000 Mbps
Workload mix:     70% RPC, 20% AI, 10% webhook
Uptime:           99.5%
Latency:          50 ms
Success rate:     99.8%
Reputation:       600
Early adopter:    yes
Nodes:            1
```

…yields approximately:

- Requests handled: **~3.4M/month**
- Net earnings: **~$110/month**
- Estimated costs: **$20/month**
- Net profit: **~$90/month**
- Payback: **~1 month**

Run the same inputs at [app.satelink.network/calculator](https://app.satelink.network/calculator) to see live numbers.

## Improving your projection

If the calculator shows negative profit, try these adjustments in order:

1. **Raise uptime above 99%** — this is the highest-impact lever and is free to improve.
2. **Reduce latency** — pick a region closer to where traffic originates.
3. **Add AI workloads** — they pay 2.5× RPC for the same compute.
4. **Earn early-adopter and geo-diversity bonuses** by joining before mainnet GA and running in an underserved region.
5. **Build reputation** — sustained good behavior unlocks the 1.4× multiplier and avoids penalties.

## Related

- [Pricing](./pricing) — how end users are billed.
- [Node Operators](./node-operators) — operational setup and earnings claim flow.
- [Settlement](./settlement) — how USDT payouts reach your wallet.
