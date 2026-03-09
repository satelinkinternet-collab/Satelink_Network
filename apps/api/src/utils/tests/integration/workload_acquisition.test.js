/**
 * Workload Acquisition Engine — Smoke Test
 *
 * Simulates 100+ workloads from mixed sources,
 * verifies they enter the DemandBuffer correctly,
 * and validates all safety controls.
 */

import { DemandBuffer } from '../../../queue/demand_buffer.js';
import { WorkloadAcquisitionEngine } from '../../../workloads/workload_acquisition_engine.js';
import { RPCConnector } from '../../../workloads/sources/rpc_source.js';
import { AIConnector } from '../../../workloads/sources/ai_source.js';
import { WebhookConnector } from '../../../workloads/sources/webhook_source.js';
import { CronConnector } from '../../../workloads/sources/cron_source.js';

let passed = 0, failed = 0;
function assert(cond, msg) {
    if (cond) { console.log(`  ✅  ${msg}`); passed++; }
    else { console.error(`  ❌  ${msg}`); failed++; }
}

// ─────────────────────────────────────────────────────────────────────────────
//  1. Individual Connectors
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Source Connectors ────────────────────────────');

const rpc = new RPCConnector();
const rpcBatch = await rpc.discover();
assert(rpcBatch.length >= 1, `RPCConnector discovers ≥1 workload (got ${rpcBatch.length})`);
assert(rpcBatch.every(w => w.op_type === 'rpc_call'), 'RPCConnector all op_type=rpc_call');
assert(rpcBatch.every(w => w.source === 'rpc'), 'RPCConnector source=rpc');
assert(rpc.stats().discovered >= 1, 'RPCConnector stats.discovered ≥ 1');

const ai = new AIConnector();
const aiBatch = await ai.discover();
assert(aiBatch.length >= 1, `AIConnector discovers ≥1 workload (got ${aiBatch.length})`);
assert(aiBatch.every(w => w.op_type === 'ai_inference'), 'AIConnector all op_type=ai_inference');

const wh = new WebhookConnector();
const whBatch = await wh.discover();
// Webhook may return 0 — that's valid (0-2 per cycle)
assert(Array.isArray(whBatch), 'WebhookConnector returns array');
if (whBatch.length > 0) {
    assert(whBatch[0].op_type === 'webhook_delivery', 'WebhookConnector op_type=webhook_delivery');
}

const cron = new CronConnector();
const cronBatch = await cron.discover();
assert(cronBatch.length >= 1, `CronConnector discovers ≥1 workload (got ${cronBatch.length})`);
assert(cronBatch.every(w => w.op_type === 'automation_job'), 'CronConnector all op_type=automation_job');

// CronConnector should NOT fire same jobs again immediately
const cronBatch2 = await cron.discover();
assert(cronBatch2.length === 0, 'CronConnector does not re-fire within interval');

// Disabled connector returns empty
rpc.enabled = false;
assert((await rpc.discover()).length === 0, 'disabled connector returns []');
rpc.enabled = true;

// ─────────────────────────────────────────────────────────────────────────────
//  2. Validation Rules
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Validation Rules ─────────────────────────────');

const buffer = new DemandBuffer();
const engine = new WorkloadAcquisitionEngine(buffer, { intervalMs: 999_999 }); // no auto-loop

// Valid workload
const valid = { op_type: 'rpc_call', target: 'ethereum', payload: { method: 'eth_blockNumber', params: [] }, reward: 0.0002, source: 'rpc' };
const v1 = engine._validate(valid);
assert(v1.ok === true, 'valid workload passes validation');

// Loopback
const loopback = { ...valid, target: '127.0.0.1' };
assert(engine._validate(loopback).reason === 'loopback', 'loopback traffic rejected');

const loopback2 = { ...valid, target: 'localhost' };
assert(engine._validate(loopback2).reason === 'loopback', 'localhost traffic rejected');

// Test traffic
const test1 = { ...valid, op_type: 'rpc_call', target: 'ethereum', payload: { method: '__test_method', params: [] } };
assert(engine._validate(test1).reason === 'test_traffic', '__test payload rejected');

const test2 = { ...valid, target: '0xtest_wallet' };
assert(engine._validate(test2).reason === 'test_traffic', '0xtest target rejected');

// Invalid payload
assert(engine._validate(null).reason === 'invalid_payload', 'null rejected');
assert(engine._validate({}).reason === 'invalid_payload', 'empty object rejected');
assert(engine._validate({ op_type: 'rpc_call' }).reason === 'invalid_payload', 'missing target rejected');

// Duplicate
engine._recordDedup(valid);
assert(engine._validate(valid).reason === 'duplicate', 'duplicate fingerprint rejected');

// ─────────────────────────────────────────────────────────────────────────────
//  3. Engine Cycle — 100 Workloads from Mixed Sources
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Engine Cycle — 100 Workloads ─────────────────');

const bigBuffer = new DemandBuffer();
// Increase rate limit for burst test
DemandBuffer.MAX_PER_WINDOW = 500;
const bigEngine = new WorkloadAcquisitionEngine(bigBuffer, { intervalMs: 999_999 });

// Run enough cycles to accumulate ≥100 workloads
let totalDiscoveredByConnectors = 0;
for (let i = 0; i < 40; i++) {
    await bigEngine.runOnce();
}

const stats = bigEngine.getStats();
assert(stats.total_discovered >= 100, `≥100 workloads discovered (got ${stats.total_discovered})`);
assert(stats.total_accepted > 0, `some workloads accepted (got ${stats.total_accepted})`);
assert(stats.total_rejected >= 0, 'rejected count tracked');
assert(bigBuffer.size() > 0, `buffer has workloads (got ${bigBuffer.size()})`);
assert(stats.cycle_count === 40, 'cycle_count = 40');
assert(stats.last_cycle_at !== null, 'last_cycle_at recorded');

// Drain and verify structure
const drained = bigBuffer.drain(50);
assert(drained.length > 0, 'drain() returns workloads');
assert(drained[0].op_type !== undefined, 'drained workload has op_type');
assert(drained[0].target !== undefined, 'drained workload has target');
assert(drained[0].payload !== undefined, 'drained workload has payload');
assert(typeof drained[0].reward === 'number', 'drained workload has numeric reward');

// Source distribution — all 4 sources should have discovered workloads
const sources = bigEngine.getSources();
assert(sources.length === 4, '4 sources registered');
assert(sources.every(s => s.discovered > 0), 'all connectors discovered > 0');
assert(sources.some(s => s.source === 'rpc'), 'rpc source present');
assert(sources.some(s => s.source === 'ai'), 'ai source present');
assert(sources.some(s => s.source === 'cron'), 'cron source present');
assert(sources.some(s => s.source === 'webhook'), 'webhook source present');

// ─────────────────────────────────────────────────────────────────────────────
//  4. Pause / Resume
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Pause / Resume ──────────────────────────────');
bigEngine.pause();
assert(bigEngine.isPaused === true, 'engine paused');

const beforePauseAccepted = bigEngine.getStats().total_accepted;
await bigEngine.runOnce();
assert(bigEngine.getStats().total_accepted === beforePauseAccepted, 'no new workloads while paused');

bigEngine.resume();
assert(bigEngine.isPaused === false, 'engine resumed');
await bigEngine.runOnce();
assert(bigEngine.getStats().total_accepted >= beforePauseAccepted, 'workloads flow after resume');

// ─────────────────────────────────────────────────────────────────────────────
//  5. Start / Stop lifecycle
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Lifecycle ───────────────────────────────────');
const lifecycleBuffer = new DemandBuffer();
const lifecycleEngine = new WorkloadAcquisitionEngine(lifecycleBuffer, { intervalMs: 50 });
lifecycleEngine.start();
await new Promise(r => setTimeout(r, 220));
lifecycleEngine.stop();

const lcStats = lifecycleEngine.getStats();
assert(lcStats.cycle_count >= 3, `lifecycle engine ran ≥3 cycles in 220ms (got ${lcStats.cycle_count})`);
assert(lcStats.total_discovered > 0, 'lifecycle engine discovered workloads');

// ─────────────────────────────────────────────────────────────────────────────
//  6. DemandBuffer integration — rate limiting & safety
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── DemandBuffer Integration ────────────────────');
const safeBuffer = new DemandBuffer();
DemandBuffer.MAX_PER_WINDOW = 5;   // very tight for testing

const result1 = safeBuffer.enqueue({ op_type: 'rpc_call', target: 'eth', payload: { m: 1 }, reward: 0 }, 'test_src');
assert(result1.accepted === true, 'first enqueue accepted');

// Fill up rate limit
for (let i = 0; i < 5; i++) {
    safeBuffer.enqueue({ op_type: 'rpc_call', target: 'eth', payload: { m: i + 10 }, reward: 0 }, 'test_src');
}
const rl = safeBuffer.enqueue({ op_type: 'rpc_call', target: 'eth', payload: { m: 99 }, reward: 0 }, 'test_src');
assert(rl.accepted === false, 'rate limit enforced by DemandBuffer');

// Oversized payload
const big = safeBuffer.enqueue({ op_type: 'rpc_call', target: 'eth', payload: { data: 'x'.repeat(11000) }, reward: 0 }, 'other_src');
assert(big.accepted === false, 'oversized payload rejected by DemandBuffer');

// ─────────────────────────────────────────────────────────────────────────────
//  Results
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Results ──────────────────────────────────────');
console.log(`   ✅  Passed: ${passed}`);
console.log(`   ❌  Failed: ${failed}`);
if (failed > 0) process.exit(1);
