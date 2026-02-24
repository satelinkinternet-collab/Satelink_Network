# Economics Waterfall Documentation

## Overview
This document covers the node operator billing and economic waterfall model to manage NodeOps payments implicitly before paying operators. 

### Principles
1. Operators who rely on NodeOps prepaid cloud must pay their dues. 
2. Gross rewards are calculated by epoch logic.
3. This waterfall splits the gross reward logically down three streams.
4. No balance is explicitly mutated; all events flow to an append-only `ledger_entries` system.

## Data Structures

### `operator_billing`
Stores the active billing requirements per operator:
* `nodeops_monthly_cost_usdt`: Raw monthly cloud obligation.
* `prepaid_until`: UNIX timestamp defining the end of their prepaid period.
* `reserve_rate`: Fractional value defining withholding (default: 0.10).
* `reserve_months_total`: Time span over which reserve applies (default: 6).
* `reserve_balance_usdt`: Sum of currently withheld reserves.
* `arrears_usdt`: Unpaid balances carrying forward from negative periods.

### `ledger_entries`
An append-only log:
* `id`, `operator_id`, `period_start`, `period_end`, `amount_usdt` (Positive Number)
* `direction`: 'in' or 'out' context relative to Operator Balance.
* `type`: Phase tracking constants.
* `status`: Transitions from `pending` -> `posted` upon verified settlement execution.

## The Mathematical Waterfall 
Run monthly per operator:

**1. Gross Inflow (`REWARD_IN`)**: The logical gross reward $R$.  
*Note: Real gross reward is aggregated from the `epoch_earnings` table (`role = 'node_operator'`) spanning the requested billing month.*
**2. Due Inflow (`NODEOPS_DUE`)**: Cost calculation $D$ where:  
	$D = 0$ if `prepaid_until` >= `period_end`  
	$D = Monthly Cost + Arrears$ otherwise.  
**3. Nodeops Payment**: $P_{nodeops} = min(R, D)$. Remainder of D is rolled to arrears.  
$Remaining_{1} = R - P_{nodeops}$  
**4. Reserve Allocation**: $P_{reserve} = min(Remaining_{1}, min(R * 0.10, Target Cap Distance))$  
*Only occurs if `reserve_months_total` has not expired.*  
$Remaining_{2} = Remaining_{1} - P_{reserve}$  
**5. Operator Payout**: $P_{operator} = max(0, Remaining_{2})$  

## Execution commands

### Run Waterfall Batch (Creates Intents)
```bash
node scripts/run_monthly_settlement.js <YYYY-MM>
```

### Execute Intents (Simulate Payout)
```bash
node scripts/execute_payment_intents.js <YYYY-MM> [--simulate-failure]
```

### Verification (Tests)
```bash
npx mocha test/NodeopsWaterfall.test.js --exit
```
