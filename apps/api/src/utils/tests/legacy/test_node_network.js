/**
 * Node Network Layer — Smoke Test
 * Verifies:
 *   1. Node registration via NodeRegistry
 *   2. Heartbeat updates node status + capacity
 *   3. NodeAwareRouter routes jobs to community nodes
 *   4. Metrics endpoint returns correct totals
 */

import Database from 'better-sqlite3';
import { NodeRegistry } from '../../../nodes/node_registry.js';
import { NodeReputation } from '../../../nodes/node_reputation.js';
import { NodeHeartbeat } from '../../../nodes/node_heartbeat.js';
import { NodeCapacity } from '../../../nodes/node_capacity.js';
import { NodeAwareRouter } from '../../../nodes/node_aware_router.js';

const db = new Database(':memory:');

let passed = 0;
let failed = 0;

function assert(condition, msg) {
    if (condition) {
        console.log(`  ✅  ${msg}`);
        passed++;
    } else {
        console.error(`  ❌  ${msg}`);
        failed++;
    }
}

// ─────────────────────────────────────────────────
//  1. Node Registry
// ─────────────────────────────────────────────────
console.log('\n── Module 1: Node Registry ──────────────────────');
const registry = new NodeRegistry(db);

const node = registry.register({ node_id: 'node-alpha', node_type: 'community', region: 'us-east', capacity: 50 });
assert(node && node.node_id === 'node-alpha', 'register() returns node');
assert(node.status === 'ACTIVE', 'new node status is ACTIVE');
assert(node.capacity === 50, 'capacity stored correctly');

registry.register({ node_id: 'node-genesis-1', node_type: 'genesis', region: 'us-west', capacity: 80 });

const fetched = registry.get('node-alpha');
assert(fetched !== null, 'get() returns existing node');

const list = registry.list('ACTIVE');
assert(list.length === 2, 'list(ACTIVE) returns 2 nodes');

registry.setStatus('node-alpha', 'INACTIVE');
const inactiveList = registry.list('ACTIVE');
assert(inactiveList.length === 1, 'setStatus marks node INACTIVE');

registry.setStatus('node-alpha', 'ACTIVE');    // restore for later tests

const metrics0 = registry.getMetrics();
assert(metrics0.total_nodes === 2, 'getMetrics().total_nodes = 2');
assert(metrics0.active_nodes === 2, 'getMetrics().active_nodes = 2');
assert(metrics0.capacity_available > 0, 'getMetrics().capacity_available > 0');

// ─────────────────────────────────────────────────
//  2. Node Heartbeat
// ─────────────────────────────────────────────────
console.log('\n── Module 2: Node Heartbeat ─────────────────────');
const reputation = new NodeReputation(registry);
const hb = new NodeHeartbeat(registry, reputation);

// Mark node-alpha INACTIVE first to test that heartbeat restores it
registry.setStatus('node-alpha', 'INACTIVE');
const hbResult = hb.receive({ node_id: 'node-alpha', cpu_usage: 30, memory_usage: 45, capacity_available: 70, latency_ms: 20 });
assert(hbResult.status === 'ACTIVE', 'heartbeat sets status = ACTIVE');
assert(hbResult.capacity_available === 70, 'heartbeat echoes capacity_available');
assert(typeof hbResult.reputation === 'number' || hbResult.reputation === null, 'reputation returned');

// Auto-register unseen node
const hbNew = hb.receive({ node_id: 'node-beta', capacity_available: 25, latency_ms: 100 });
assert(hbNew.status === 'ACTIVE', 'heartbeat auto-registers unknown node');
const beta = registry.get('node-beta');
assert(beta !== null, 'auto-registered node appears in registry');

// ─────────────────────────────────────────────────
//  3. Node Reputation
// ─────────────────────────────────────────────────
console.log('\n── Module 3: Node Reputation ────────────────────');
const repResult = reputation.calculate('node-alpha', {
    uptime_pct: 99,
    jobs_total: 100,
    jobs_succeeded: 95,
    latency_ms: 40
});
assert(repResult.score >= 0 && repResult.score <= 100, 'score in [0,100]');
assert(repResult.score > 90, 'high-performing node scores > 90');
assert(repResult.breakdown.latency_score === 100, 'latency < ideal → score = 100');

const lowRep = reputation.calculate('node-bad', { uptime_pct: 50, jobs_total: 100, jobs_succeeded: 40, latency_ms: 1500 });
assert(lowRep.score < 60, 'poor node scores below 60');

// ─────────────────────────────────────────────────
//  4. Node Capacity Tracking
// ─────────────────────────────────────────────────
console.log('\n── Module 4: Node Capacity Tracking ────────────');
const cap = new NodeCapacity(registry);
cap.update('node-alpha', 80);
const alphaAfterUpdate = registry.get('node-alpha');
assert(alphaAfterUpdate.capacity === 80, 'capacity.update() persists new value');

const available = cap.getAvailableNodes();
assert(available.length > 0, 'getAvailableNodes() returns nodes with capacity > 0');
assert(available[0].capacity >= available[1]?.capacity ?? 0, 'nodes sorted by capacity desc');

const summary = cap.summary();
assert(summary.active_nodes > 0, 'summary().active_nodes > 0');
assert(summary.capacity_available > 0, 'summary().capacity_available > 0');

// ─────────────────────────────────────────────────
//  5. Node-Aware Router (Module 5)
// ─────────────────────────────────────────────────
console.log('\n── Module 5: Node-Aware Router ──────────────────');
const router = new NodeAwareRouter(db);
// node-genesis-1 & node-alpha are ACTIVE in the registry

const source = await router.selectExecutionSource('ethereum', {});
assert(['genesis_node', 'community_node'].includes(source.type), `selectExecutionSource returns valid type: ${source.type}`);
assert(source.node_id !== undefined, 'source has node_id');
assert(source.source === 'node_registry', 'source is node_registry');

const routerMetrics = router.getMetrics();
assert(routerMetrics.total_nodes > 0, 'router.getMetrics() reports nodes');

// ─────────────────────────────────────────────────
//  6. Metrics (Module 6)
// ─────────────────────────────────────────────────
console.log('\n── Module 6: Metrics ────────────────────────────');
const finalMetrics = registry.getMetrics();
assert(finalMetrics.total_nodes >= 3, `total_nodes ≥ 3 (got ${finalMetrics.total_nodes})`);
assert(finalMetrics.active_nodes >= 1, 'active_nodes ≥ 1');
assert(finalMetrics.capacity_available >= 0, 'capacity_available is a number');

// ─────────────────────────────────────────────────
//  Result
// ─────────────────────────────────────────────────
console.log(`\n── Results ──────────────────────────────────────`);
console.log(`   ✅  Passed: ${passed}`);
console.log(`   ❌  Failed: ${failed}`);
console.log(`   ─────────────────────────────────────────────`);
if (failed > 0) process.exit(1);
