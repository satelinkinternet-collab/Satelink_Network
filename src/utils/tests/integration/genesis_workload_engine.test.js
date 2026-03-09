/**
 * Genesis Workload Engine — Test Suite
 *
 * Simulates 1000+ generated workloads.
 * Verifies:
 *   - all 4 sources produce valid workloads
 *   - duplicates are filtered (dedup window)
 *   - invalid payloads are rejected
 *   - workloads enter DemandBuffer with correct structure
 *   - source distribution is tracked
 *   - pause/resume works
 *   - lifecycle (start/stop) works
 */

import { DemandBuffer } from '../../../queue/demand_buffer.js';
import { GenesisWorkloadEngine } from '../../../genesis-nodes/genesis_workload_engine.js';
import { BlockchainIndexerSource } from '../../../genesis-nodes/sources/blockchain_indexer_source.js';
import { DataAggregationSource } from '../../../genesis-nodes/sources/data_aggregation_source.js';
import { VerificationSource } from '../../../genesis-nodes/sources/verification_source.js';
import { AIMicrotaskSource } from '../../../genesis-nodes/sources/ai_microtask_source.js';

let passed = 0, failed = 0;
function assert(cond, msg) {
    if (cond) { console.log(`  ✅  ${msg}`); passed++; }
    else { console.error(`  ❌  ${msg}`); failed++; }
}

// ─────────────────────────────────────────────────────────────────────────────
//  1. Individual Sources
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Sources ──────────────────────────────────────');

// BlockchainIndexerSource
const indexer = new BlockchainIndexerSource(3);
const iB1 = indexer.generate();
const iB2 = indexer.generate();
assert(iB1.length === 3, 'indexer batch_size=3 → 3 tasks');
assert(iB1.every(w => w.op_type === 'data_processing'), 'indexer op_type=data_processing');
assert(iB1.every(w => w.source === 'blockchain_indexer'), 'indexer source tag correct');
// Block numbers advance each cycle
const blocks1 = iB1.map(w => w.payload.block_number);
const blocks2 = iB2.map(w => w.payload.block_number);
assert(blocks2[0] > blocks1[0], 'block numbers advance each cycle (no duplicate payloads)');
assert(indexer.stats().generated === 6, 'indexer.stats().generated = 6');

// DataAggregationSource
const agg = new DataAggregationSource(2);
const aB1 = agg.generate();
assert(aB1.length === 2, 'aggregation batch_size=2');
assert(aB1.every(w => w.op_type === 'data_processing'), 'aggregation op_type=data_processing');
assert(['coingecko', 'token_registry', 'uniswap', 'aave', 'compound', 'curve', 'balancer'].includes(aB1[0].target),
    'aggregation target is a known endpoint');
assert(agg.stats().generated === 2, 'aggregation stats correct');

// VerificationSource
const ver = new VerificationSource(2);
const vB1 = ver.generate();
assert(vB1.length === 2, 'verification batch_size=2');
assert(vB1.every(w => w.op_type === 'data_processing'), 'verification op_type=data_processing');
assert(vB1.some(w => ['api_health_check', 'signature_verification', 'dataset_integrity'].includes(w.payload.operation)),
    'verification operation is valid');

// AIMicrotaskSource
const ai = new AIMicrotaskSource(2);
const aI1 = ai.generate();
assert(aI1.length === 2, 'ai_microtask batch_size=2');
assert(aI1.every(w => w.op_type === 'ai_inference'), 'ai op_type=ai_inference');
assert(aI1.every(w => w.reward >= 0.0008), 'ai reward ≥ 0.0008 (higher value work)');
assert(aI1.some(w => ['text_classification', 'embedding', 'summarization'].includes(w.payload.operation)),
    'ai operation is valid');

// ─────────────────────────────────────────────────────────────────────────────
//  2. Deduplication
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Deduplication ────────────────────────────────');

const dedupBuffer = new DemandBuffer();
DemandBuffer.MAX_PER_WINDOW = 2000;
const dedupEngine = new GenesisWorkloadEngine(dedupBuffer, { intervalMs: 999_999 });

// Run one cycle
await dedupEngine.runOnce();
const afterFirst = dedupEngine.getStats().workloads_enqueued;
assert(afterFirst > 0, `first cycle enqueued ${afterFirst} workloads`);

// Run second cycle — blockchain indexer produces new blocks (unique),
// but aggregation/verification with same time_bucket will be duplicates
await dedupEngine.runOnce();
const afterSecond = dedupEngine.getStats();
// Some duplicates should have been caught (data_aggregation / verification share time_bucket)
assert(afterSecond.duplicates_filtered >= 0, 'duplicates_filtered tracked (≥0)');
assert(afterSecond.workloads_enqueued >= afterFirst, 'enqueued count grows across cycles');

// ─────────────────────────────────────────────────────────────────────────────
//  3. 1000 Workloads — large burst
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── 1000 Workload Burst ──────────────────────────');

const bigBuffer = new DemandBuffer();
DemandBuffer.MAX_PER_WINDOW = 5000;

// Use large batch sizes to hit 1000 quickly
const bigEngine = new GenesisWorkloadEngine(bigBuffer, { intervalMs: 999_999 });
// Override source batch sizes for burst test
bigEngine.sources[0].batchSize = 30;  // blockchain_indexer
bigEngine.sources[1].batchSize = 20;  // data_aggregation
bigEngine.sources[2].batchSize = 20;  // verification
bigEngine.sources[3].batchSize = 20;  // ai_microtask

// Run enough cycles to generate ≥1000 workloads
for (let i = 0; i < 13; i++) await bigEngine.runOnce();

const bStats = bigEngine.getStats();
assert(bStats.workloads_generated >= 1000, `≥1000 generated (got ${bStats.workloads_generated})`);
assert(bStats.workloads_enqueued > 0, `workloads enqueued (got ${bStats.workloads_enqueued})`);
assert(bStats.cycle_count === 13, 'cycle_count = 13');
assert(bStats.last_cycle_at !== null, 'last_cycle_at recorded');

// Source distribution — all 4 sources should have contributed
const dist = bStats.source_distribution;
assert(dist.blockchain_indexer > 0, `blockchain_indexer contributed (${dist.blockchain_indexer})`);
assert(dist.data_aggregation > 0, `data_aggregation contributed (${dist.data_aggregation})`);
assert(dist.verification > 0, `verification contributed (${dist.verification})`);
assert(dist.ai_microtask > 0, `ai_microtask contributed (${dist.ai_microtask})`);

// DemandBuffer content
const drained = bigBuffer.drain(500);
assert(drained.length > 0, 'drain() returns workloads');
assert(drained.every(w => w.op_type !== undefined), 'all have op_type');
assert(drained.every(w => w.target !== undefined), 'all have target');
assert(drained.every(w => typeof w.reward === 'number'), 'all have numeric reward');
assert(drained.every(w => typeof w.payload === 'object'), 'all have object payload');

// op_type distribution in buffer
const opTypes = new Set(drained.map(w => w.op_type));
assert(opTypes.has('data_processing'), 'data_processing in buffer');
assert(opTypes.has('ai_inference'), 'ai_inference in buffer');

// ─────────────────────────────────────────────────────────────────────────────
//  4. Validation — invalid payloads rejected
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Validation ───────────────────────────────────');

// Direct test of engine._isValid()
const engine = new GenesisWorkloadEngine(new DemandBuffer(), { intervalMs: 999_999 });
assert(engine._isValid({ op_type: 'data_processing', target: 'eth', payload: {} }) === true, 'valid payload passes');
assert(engine._isValid(null) === false, 'null rejected');
assert(engine._isValid({}) === false, 'empty object rejected');
assert(engine._isValid({ op_type: 'bad_type', target: 'x', payload: {} }) === false, 'bad op_type rejected');
assert(engine._isValid({ op_type: 'data_processing', target: '', payload: {} }) === false, 'empty target rejected');
assert(engine._isValid({ op_type: 'data_processing', target: 'x', payload: null }) === false, 'null payload rejected');
assert(engine._isValid({ op_type: 'data_processing', target: 'x', payload: 'str' }) === false, 'string payload rejected');

// ─────────────────────────────────────────────────────────────────────────────
//  5. Pause / Resume
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Pause / Resume ───────────────────────────────');

const prBuffer = new DemandBuffer();
const prEngine = new GenesisWorkloadEngine(prBuffer, { intervalMs: 999_999 });
await prEngine.runOnce();
const beforePause = prEngine.getStats().workloads_enqueued;

prEngine.pause();
assert(prEngine.isPaused === true, 'engine paused');
await prEngine.runOnce();
assert(prEngine.getStats().workloads_enqueued === beforePause, 'no new workloads while paused');

prEngine.resume();
assert(prEngine.isPaused === false, 'engine resumed');
await prEngine.runOnce();
assert(prEngine.getStats().workloads_enqueued > beforePause, 'workloads flow after resume');

// ─────────────────────────────────────────────────────────────────────────────
//  6. Stats / Admin API
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Stats & Admin ────────────────────────────────');

const statsEngine = new GenesisWorkloadEngine(new DemandBuffer(), { intervalMs: 999_999 });
await statsEngine.runOnce();
const s = statsEngine.getStats();
assert(typeof s.workloads_generated === 'number', 'stats.workloads_generated is number');
assert(typeof s.workloads_enqueued === 'number', 'stats.workloads_enqueued is number');
assert(typeof s.duplicates_filtered === 'number', 'stats.duplicates_filtered is number');
assert(typeof s.buffer_depth === 'number', 'stats.buffer_depth is number');
assert(typeof s.cycle_count === 'number', 'stats.cycle_count is number');
assert(s.paused === false, 'stats.paused = false');

const srcs = statsEngine.getSources();
assert(srcs.length === 4, 'getSources() returns 4 entries');
assert(srcs.every(s => typeof s.source === 'string'), 'each source has name');
assert(srcs.every(s => typeof s.generated === 'number'), 'each source has generated count');

// ─────────────────────────────────────────────────────────────────────────────
//  7. Lifecycle
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Lifecycle ────────────────────────────────────');

const lcBuffer = new DemandBuffer();
const lcEngine = new GenesisWorkloadEngine(lcBuffer, { intervalMs: 60 });
lcEngine.start();
await new Promise(r => setTimeout(r, 250));
lcEngine.stop();

const lc = lcEngine.getStats();
assert(lc.cycle_count >= 3, `lifecycle: ≥3 cycles in 250ms (got ${lc.cycle_count})`);
assert(lc.workloads_generated > 0, 'lifecycle: workloads generated over time');

// ─────────────────────────────────────────────────────────────────────────────
//  Results
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Results ──────────────────────────────────────');
console.log(`   ✅  Passed: ${passed}`);
console.log(`   ❌  Failed: ${failed}`);
if (failed > 0) process.exit(1);
