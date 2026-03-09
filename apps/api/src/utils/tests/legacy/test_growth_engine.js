/**
 * Node Growth Engine — Smoke Test
 * Covers all 5 modules without a live HTTP server.
 */

import Database from 'better-sqlite3';
import { NetworkMetrics } from '../../../monitoring/network_metrics.js';
import { NodeLeaderboard } from '../../../monitoring/node_leaderboard.js';
import { NodeIncentiveEngine } from '../../../economics/node_incentives.js';
import { NodeOnboardingService } from '../../../nodes/node_onboarding.js';
import { NodeRegistry } from '../../../nodes/node_registry.js';

const db = new Database(':memory:');

let passed = 0, failed = 0;
function assert(cond, msg) {
    if (cond) { console.log(`  ✅  ${msg}`); passed++; }
    else { console.error(`  ❌  ${msg}`); failed++; }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Shared setup — register nodes FIRST so the LEFT JOIN in leaderboard works
// ─────────────────────────────────────────────────────────────────────────────

// Seed workload_metrics table (from Day-1 workload layer)
db.prepare(`CREATE TABLE IF NOT EXISTS workload_metrics (key TEXT PRIMARY KEY, value REAL DEFAULT 0)`).run();
for (const [k, v] of [['rpc_requests', 120], ['webhook_events', 40], ['automation_jobs', 30], ['daily_revenue', 0.38]]) {
    db.prepare(`INSERT OR REPLACE INTO workload_metrics (key,value) VALUES (?,?)`).run(k, v);
}

const registry = new NodeRegistry(db);
registry.register({ node_id: 'node-alpha', node_type: 'community', region: 'us-east', capacity: 10 });
registry.register({ node_id: 'node-beta', node_type: 'genesis', region: 'eu-west', capacity: 20 });
registry.register({ node_id: 'node-gamma', node_type: 'community', region: 'ap-east', capacity: 5 });

// ─────────────────────────────────────────────────────────────────────────────
//  MODULE 2 — Node Leaderboard
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Module 2: Node Leaderboard ───────────────────');
const leaderboard = new NodeLeaderboard(db);

leaderboard.recordJob('node-alpha', 0.005);
leaderboard.recordJob('node-alpha', 0.003);
leaderboard.recordJob('node-beta', 0.010);
leaderboard.recordJob('node-gamma', 0.001);

const lb = leaderboard.getLeaderboard(10);
assert(lb.length === 3, 'leaderboard has 3 entries');
assert(lb[0].node_id === 'node-beta', 'node-beta leads by earnings_total');
assert(lb[0].rank === 1, 'rank 1 assigned to leader');
assert(lb[1].node_id === 'node-alpha', 'node-alpha is rank 2');
assert(lb[0].earnings_total > lb[1].earnings_total, 'leaderboard sorted by earnings_total DESC');

const sum = leaderboard.summary();
assert(sum.total_ranked === 3, 'summary: total_ranked = 3');
assert(sum.total_jobs === 4, 'summary: total_jobs = 4');
assert(sum.total_paid > 0, 'summary: total_paid > 0');
assert(sum.top_earner_total > 0, 'summary: top_earner_total > 0');

// Reset daily earnings
leaderboard.resetDailyEarnings();
const afterReset = leaderboard.getLeaderboard(10);
assert(afterReset.every(n => n.earnings_today === 0), 'resetDailyEarnings() zeroes earnings_today');


// ─────────────────────────────────────────────────────────────────────────────
//  MODULE 1 — Network Metrics
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Module 1: Network Metrics ────────────────────');

const netMetrics = new NetworkMetrics(db);
const snap = netMetrics.snapshot();

assert(snap.active_nodes >= 3, `active_nodes ≥ 3 (got ${snap.active_nodes})`);
assert(snap.total_nodes >= 3, `total_nodes ≥ 3  (got ${snap.total_nodes})`);
assert(snap.network_capacity >= 35, `capacity ≥ 35 (got ${snap.network_capacity})`);
assert(snap.daily_revenue > 0, `daily_revenue > 0 (got ${snap.daily_revenue})`);
assert(snap.workloads_per_second >= 0, 'workloads_per_second returned');
assert(snap.available_node_rewards >= 0, 'available_node_rewards ≥ 0');
assert(typeof snap.capacity_available === 'number', 'capacity_available is numeric');

// available_node_rewards = 60% of daily_revenue
const expectedPool = Math.round(snap.daily_revenue * 0.6 * 10000) / 10000;
assert(Math.abs(snap.available_node_rewards - expectedPool) < 0.0001, 'reward pool = 60% of revenue');

// ─────────────────────────────────────────────────────────────────────────────
//  MODULE 3 — Node Incentive Engine
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Module 3: Node Incentive Engine ──────────────');

// node-alpha: first registered → first_100 bonus, default rep (100) → uptime bonus
// Give node-alpha enough jobs to trigger performance bonus
for (let i = 0; i < 100; i++) leaderboard.recordJob('node-alpha', 0.001);

const incentives = new NodeIncentiveEngine(db, registry, leaderboard);

const alphaInc = incentives.evaluate('node-alpha');
assert(alphaInc.bonuses.includes('first_100_nodes_bonus'), 'node-alpha gets first_100_nodes_bonus');
assert(alphaInc.bonuses.includes('high_uptime_bonus'), 'node-alpha gets high_uptime_bonus (rep=100)');
assert(alphaInc.bonuses.includes('high_performance_bonus'), 'node-alpha gets high_performance_bonus (≥100 jobs)');
assert(alphaInc.multiplier >= 1.25, `multiplier ≥ 1.25 (got ${alphaInc.multiplier})`);

// node-gamma: same early node group, default rep, fewer jobs
const gammaInc = incentives.evaluate('node-gamma');
assert(gammaInc.bonuses.includes('first_100_nodes_bonus'), 'node-gamma gets first_100_nodes_bonus');
assert(gammaInc.bonuses.includes('high_uptime_bonus'), 'node-gamma gets high_uptime_bonus (rep=100)');
assert(!gammaInc.bonuses.includes('high_performance_bonus'), 'node-gamma does NOT get performance bonus');

// applyIncentive
const applied = incentives.applyIncentive('node-alpha', 1.0);
assert(applied.adjusted_reward > applied.raw_reward, 'adjusted_reward > raw_reward with bonuses');
assert(applied.multiplier === alphaInc.multiplier, 'multiplier matches evaluate()');

// A brand-new node with low reputation — only first_100 bonus (if early)
registry.register({ node_id: 'node-new', node_type: 'community', region: 'global', capacity: 5 });
// Manually downgrade reputation
db.prepare('UPDATE node_registry SET reputation = 50 WHERE node_id = ?').run('node-new');

const newInc = incentives.evaluate('node-new');
assert(!newInc.bonuses.includes('high_uptime_bonus'), 'low-rep node has no uptime bonus');
assert(!newInc.bonuses.includes('high_performance_bonus'), 'no-jobs node has no performance bonus');

// ─────────────────────────────────────────────────────────────────────────────
//  MODULE 4 — Node Onboarding Service
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Module 4: Node Onboarding Service ────────────');
const onboarding = new NodeOnboardingService(db);

const result = onboarding.onboard({
    node_id: 'node-newop',
    node_type: 'community',
    region: 'us-west',
    capacity: 15
});
assert(result.ok === true, 'onboard() returns ok: true');
assert(result.node_id === 'node-newop', 'node_id in result');
assert(result.status === 'ACTIVE', 'new node status = ACTIVE');
assert(Array.isArray(result.bootstrap.instructions), 'bootstrap.instructions is array');
assert(result.bootstrap.instructions.length >= 5, 'instructions has ≥ 5 steps');
assert(typeof result.bootstrap.configuration === 'object', 'configuration is object');

// Config fields
const cfg = result.bootstrap.configuration;
assert(cfg.node_id === 'node-newop', 'config.node_id matches');
assert(cfg.heartbeat_interval_seconds === 30, 'config.heartbeat_interval_seconds = 30');
assert(Array.isArray(cfg.supported_op_types), 'config.supported_op_types is array');

// Incentive preview
assert(typeof result.incentives.current_multiplier === 'number', 'incentives.current_multiplier is number');
assert(result.incentives.current_multiplier >= 1.0, 'multiplier ≥ 1.0');

// Network context
assert(typeof result.network.total_nodes === 'number', 'network.total_nodes is number');
assert(typeof result.network.your_position === 'number', 'network.your_position is number');
assert(typeof result.network.early_node === 'boolean', 'network.early_node is boolean');

// Missing node_id
let threw = false;
try { onboarding.onboard({}); } catch { threw = true; }
assert(threw, 'throws when node_id is missing');

// ─────────────────────────────────────────────────────────────────────────────
//  MODULE 5 — Integration: registry → leaderboard → incentives
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Module 5: Integration ────────────────────────');

// Verifying that onboarding writes to node_registry AND leaderboard
const regNode = registry.get('node-newop');
assert(regNode !== null, 'node-newop exists in node_registry');

const lbAfterOnboard = leaderboard.getLeaderboard(200);
const found = lbAfterOnboard.find(n => n.node_id === 'node-newop');
assert(found !== undefined, 'node-newop seeded in leaderboard after onboard()');

// Incentive engine reads registry reputation seamlessly
registry.setReputation('node-newop', 95);
const updatedInc = incentives.evaluate('node-newop');
assert(updatedInc.bonuses.includes('high_uptime_bonus'), 'uptime bonus applied after reputation update');

// Network metrics reflects new node
const snap2 = netMetrics.snapshot();
assert(snap2.active_nodes > snap.active_nodes, 'network snapshot active_nodes increased after new registrations');

// ─────────────────────────────────────────────────────────────────────────────
//  Results
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Results ──────────────────────────────────────');
console.log(`   ✅  Passed: ${passed}`);
console.log(`   ❌  Failed: ${failed}`);
if (failed > 0) process.exit(1);
