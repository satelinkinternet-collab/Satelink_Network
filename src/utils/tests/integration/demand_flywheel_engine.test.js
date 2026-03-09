/**
 * Demand Flywheel Engine — Test Suite
 *
 * Simulates 100 completed workloads.
 * Verifies:
 *   - all 4 strategies fire for the right workload types
 *   - no infinite loops (flywheel source guard)
 *   - max_followups_per_workload is respected
 *   - abuse firewall decisions are honored
 *   - jobs enter DemandBuffer with correct normalised structure
 *   - rate limiter caps throughput
 *   - pause / resume lifecycle
 *   - client prediction fires after threshold
 *   - stats API returns all required fields
 *
 * Run: node tests/demand_flywheel_engine.test.js
 */

import { DemandBuffer } from '../../../queue/demand_buffer.js';
import { DemandFlywheelEngine } from '../../../scheduler/demand_flywheel_engine.js';

// ─── Minimal test harness ──────────────────────────────────────────────────

let passed = 0, failed = 0;
function assert(cond, msg) {
    if (cond) { console.log(`  ✅  ${msg}`); passed++; }
    else { console.error(`  ❌  ${msg}`); failed++; }
}

// ─── Mock AbuseFirewall ────────────────────────────────────────────────────

function makeMockFirewall(decision = 'allow') {
    return {
        decide: async () => ({ decision }),
    };
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function makeWorkload(overrides = {}) {
    return {
        id: `wl-${Math.random().toString(36).slice(2, 9)}`,
        op_type: 'data_processing',
        payload: { block_number: 18500000, chain: 'ethereum' },
        client_id: 'client-test-001',
        latency_ms: 120,
        success: true,
        source: 'genesis',
        target: 'blockchain_indexer',
        ...overrides,
    };
}

/** Emit N workload.completed events and wait a tick for async handlers. */
async function emitN(engine, n, workloadFn = makeWorkload) {
    for (let i = 0; i < n; i++) {
        engine.emit('workload.completed', workloadFn());
    }
    // Allow microtasks to settle
    await new Promise(r => setImmediate(r));
}

// ═══════════════════════════════════════════════════════════════════════════
//  1. Instantiation
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 1. Instantiation ─────────────────────────────');

{
    const buf = new DemandBuffer();
    DemandBuffer.MAX_PER_WINDOW = 5000;
    const fw = makeMockFirewall('allow');
    const engine = new DemandFlywheelEngine(buf, fw);
    assert(engine instanceof DemandFlywheelEngine, 'engine instantiates without error');
    assert(engine.isPaused === false, 'engine starts unpaused');
    assert(typeof engine.getStats === 'function', 'has getStats()');
    assert(typeof engine.getRecentJobs === 'function', 'has getRecentJobs()');
}

// ═══════════════════════════════════════════════════════════════════════════
//  2. Strategy 1 — Chain Expansion
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 2. Strategy 1: Chain Expansion ───────────────');

{
    const buf = new DemandBuffer();
    DemandBuffer.MAX_PER_WINDOW = 5000;
    const engine = new DemandFlywheelEngine(buf, makeMockFirewall('allow'), {
        strategies: { chain_expansion: true, data_dependency: false, verification_jobs: false, client_prediction: false },
        max_followups_per_workload: 5,
        max_jobs_per_minute: 1000,
        verification_cadence: 99999, // suppress verification
    });
    engine.start();

    const blockWl = makeWorkload({ payload: { block_number: 18500000, chain: 'ethereum' } });
    engine.emit('workload.completed', blockWl);
    await new Promise(r => setImmediate(r));

    const stats = engine.getStats();
    assert(stats.jobs_enqueued >= 1, `Chain expansion enqueued ≥1 job (got ${stats.jobs_enqueued})`);

    const drained = buf.drain(100);
    const withBlock = drained.filter(w => w.payload?.operation === 'index_block');
    assert(withBlock.length >= 1, `Chain expansion produced index_block job(s)`);

    const blockNums = withBlock.map(w => w.payload.block_number).filter(Boolean);
    assert(blockNums.some(n => n > 18500000), 'Enqueued block numbers are greater than parent');

    engine.stop();
}

// ═══════════════════════════════════════════════════════════════════════════
//  3. Strategy 2 — Data Dependency Expansion
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 3. Strategy 2: Data Dependency Expansion ─────');

{
    const buf = new DemandBuffer();
    DemandBuffer.MAX_PER_WINDOW = 5000;
    const engine = new DemandFlywheelEngine(buf, makeMockFirewall('allow'), {
        strategies: { chain_expansion: false, data_dependency: true, verification_jobs: false, client_prediction: false },
        max_followups_per_workload: 5,
        max_jobs_per_minute: 1000,
    });
    engine.start();

    const tokenWl = makeWorkload({ payload: { token_address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' } });
    engine.emit('workload.completed', tokenWl);
    await new Promise(r => setImmediate(r));

    const drained = buf.drain(100);
    const depJobs = drained.filter(w =>
        ['fetch_liquidity_pool', 'fetch_transaction_statistics', 'fetch_token_holders'].includes(w.payload?.operation)
    );
    assert(depJobs.length >= 1, `Data dep expansion produced ≥1 related entity job (got ${depJobs.length})`);
    assert(depJobs.every(w => w.payload.token_address), 'All dep jobs carry token_address in payload');

    engine.stop();
}

// ═══════════════════════════════════════════════════════════════════════════
//  4. Strategy 3 — Verification Jobs
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 4. Strategy 3: Verification Jobs ─────────────');

{
    const buf = new DemandBuffer();
    DemandBuffer.MAX_PER_WINDOW = 5000;
    // cadence=1 → every completion triggers a verification job
    const engine = new DemandFlywheelEngine(buf, makeMockFirewall('allow'), {
        strategies: { chain_expansion: false, data_dependency: false, verification_jobs: true, client_prediction: false },
        max_followups_per_workload: 5,
        max_jobs_per_minute: 1000,
        verification_cadence: 1,
    });
    engine.start();

    const VALID_VER_OPS = ['api_health_check', 'dataset_validation', 'signature_verification'];

    engine.emit('workload.completed', makeWorkload());
    await new Promise(r => setImmediate(r));

    const drained = buf.drain(100);
    const verJobs = drained.filter(w => VALID_VER_OPS.includes(w.payload?.operation));
    assert(verJobs.length >= 1, `Verification strategy produced ≥1 job (got ${verJobs.length})`);
    assert(verJobs.every(w => VALID_VER_OPS.includes(w.payload.operation)), 'Verification jobs have valid operation');

    engine.stop();
}

// ═══════════════════════════════════════════════════════════════════════════
//  5. Strategy 4 — Client Demand Prediction
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 5. Strategy 4: Client Demand Prediction ──────');

{
    const buf = new DemandBuffer();
    DemandBuffer.MAX_PER_WINDOW = 5000;
    const engine = new DemandFlywheelEngine(buf, makeMockFirewall('allow'), {
        strategies: { chain_expansion: false, data_dependency: false, verification_jobs: false, client_prediction: true },
        max_followups_per_workload: 5,
        max_jobs_per_minute: 1000,
        prediction_threshold: 3,
        prediction_window_hours: 24,
        verification_cadence: 99999,
    });
    engine.start();

    const clientWl = () => makeWorkload({ client_id: 'predict-client', op_type: 'data_processing' });

    // Emit threshold completions for the same client → should trigger prediction
    for (let i = 0; i < 3; i++) {
        engine.emit('workload.completed', clientWl());
        await new Promise(r => setImmediate(r));
    }

    const stats = engine.getStats();
    assert(stats.client_prediction_hits >= 1, `Client prediction fired ≥1 time (got ${stats.client_prediction_hits})`);

    const drained = buf.drain(100);
    const predicted = drained.filter(w => w.payload?.operation === 'predicted_repeat');
    assert(predicted.length >= 1, `Predicted workloads entered demand_buffer`);
    assert(predicted.every(w => w.payload.client_id === 'predict-client'), 'Predicted jobs carry correct client_id');

    engine.stop();
}

// ═══════════════════════════════════════════════════════════════════════════
//  6. 100-workload simulation
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 6. 100-Workload Simulation ────────────────────');

{
    const buf = new DemandBuffer();
    DemandBuffer.MAX_PER_WINDOW = 5000;
    const engine = new DemandFlywheelEngine(buf, makeMockFirewall('allow'), {
        max_followups_per_workload: 5,
        max_jobs_per_minute: 1000,
        verification_cadence: 5,
        prediction_threshold: 3,
    });
    engine.start();

    // Mix of workload types
    const types = [
        () => makeWorkload({ payload: { block_number: Math.floor(18000000 + Math.random() * 500000), chain: 'ethereum' } }),
        () => makeWorkload({ payload: { token_address: '0x' + Math.random().toString(16).slice(2, 42) } }),
        () => makeWorkload({ op_type: 'ai_inference', payload: { model: 'gpt2', task: 'classify' } }),
        () => makeWorkload({ client_id: 'heavy-client' }),
    ];

    for (let i = 0; i < 100; i++) {
        const fn = types[i % types.length];
        engine.emit('workload.completed', fn());
    }
    await new Promise(r => setImmediate(r));

    const stats = engine.getStats();
    assert(stats.completion_events_seen === 100, `100 completions seen (got ${stats.completion_events_seen})`);
    assert(stats.jobs_generated > 0, `Follow-up jobs generated (got ${stats.jobs_generated})`);
    assert(stats.jobs_enqueued > 0, `Jobs enqueued to DemandBuffer (got ${stats.jobs_enqueued})`);
    assert(stats.jobs_enqueued <= stats.jobs_generated, 'jobs_enqueued ≤ jobs_generated');

    // DemandBuffer entries have correct schema
    const drained = buf.drain(200);
    assert(drained.length > 0, `DemandBuffer has entries (got ${drained.length})`);
    assert(drained.every(w => w.op_type !== undefined), 'All jobs have op_type');
    assert(drained.every(w => w.target !== undefined), 'All jobs have target');
    assert(drained.every(w => typeof w.payload === 'object'), 'All jobs have object payload');
    assert(drained.every(w => w.payload.source === 'demand_flywheel'), 'All jobs tagged source:demand_flywheel');
    assert(drained.every(w => w.payload.parent_workload_id !== undefined), 'All jobs have parent_workload_id');
    assert(drained.every(w => w.payload.priority === 'low'), 'All jobs tagged priority:low');
    assert(drained.every(w => w.reward === 0), 'All flywheel jobs have reward=0');

    engine.stop();
}

// ═══════════════════════════════════════════════════════════════════════════
//  7. No Infinite Loops (Loop Guard)
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 7. No Infinite Loops (Loop Guard) ────────────');

{
    const buf = new DemandBuffer();
    DemandBuffer.MAX_PER_WINDOW = 5000;
    const engine = new DemandFlywheelEngine(buf, makeMockFirewall('allow'), {
        max_followups_per_workload: 5,
        max_jobs_per_minute: 1000,
        verification_cadence: 1,
    });
    engine.start();

    const before = engine.getStats().jobs_generated;

    // Emit a workload that is itself a flywheel-generated job
    engine.emit('workload.completed', makeWorkload({ source: 'demand_flywheel', success: true }));
    await new Promise(r => setImmediate(r));

    const after = engine.getStats().jobs_generated;
    assert(after === before, 'Flywheel source jobs do NOT generate further flywheel jobs (no infinite loop)');
    assert(engine.getStats().jobs_loop_guarded >= 1, 'Loop guard counter incremented');

    engine.stop();
}

// ═══════════════════════════════════════════════════════════════════════════
//  8. max_followups_per_workload cap
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 8. max_followups_per_workload Cap ─────────────');

{
    const buf = new DemandBuffer();
    DemandBuffer.MAX_PER_WINDOW = 5000;
    // Enable all strategies and configure to be very generous → cap at 2
    const engine = new DemandFlywheelEngine(buf, makeMockFirewall('allow'), {
        max_followups_per_workload: 2,
        max_jobs_per_minute: 1000,
        verification_cadence: 1,
        prediction_threshold: 1,
    });
    engine.start();

    // Token workload hits all strategies
    const richWl = makeWorkload({
        client_id: 'rich-client',
        payload: { block_number: 18500000, token_address: '0xUSDA', chain: 'ethereum' },
    });
    engine.emit('workload.completed', richWl);
    await new Promise(r => setImmediate(r));

    const drained = buf.drain(50);
    assert(drained.length <= 2, `max_followups=2 → at most 2 jobs enqueued (got ${drained.length})`);

    engine.stop();
}

// ═══════════════════════════════════════════════════════════════════════════
//  9. Abuse Firewall — blocked client produces no jobs
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 9. Abuse Firewall Respected ───────────────────');

{
    const buf = new DemandBuffer();
    DemandBuffer.MAX_PER_WINDOW = 5000;
    const engine = new DemandFlywheelEngine(buf, makeMockFirewall('block'), {
        max_jobs_per_minute: 1000,
        verification_cadence: 1,
    });
    engine.start();

    await emitN(engine, 10);

    const stats = engine.getStats();
    assert(stats.jobs_blocked_by_firewall >= 1, `Firewall block respected (blocked ${stats.jobs_blocked_by_firewall})`);
    assert(stats.jobs_enqueued === 0, 'No jobs enqueued when firewall blocks');

    engine.stop();
}

// ═══════════════════════════════════════════════════════════════════════════
//  10. Rate Limiter
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 10. Rate Limiter ──────────────────────────────');

{
    const buf = new DemandBuffer();
    DemandBuffer.MAX_PER_WINDOW = 5000;
    // Limit to 2 jobs per minute — fire a burst of workloads that would generate more
    const engine = new DemandFlywheelEngine(buf, makeMockFirewall('allow'), {
        max_followups_per_workload: 5,
        max_jobs_per_minute: 2,
        verification_cadence: 1,
        prediction_threshold: 1,
    });
    engine.start();

    // Rich workloads → many candidates → rate limiter kicks in after 2 tokens consumed
    for (let i = 0; i < 20; i++) {
        engine.emit('workload.completed', makeWorkload({
            payload: { block_number: 18500000 + i, token_address: '0xUSDA', chain: 'ethereum' }
        }));
    }
    await new Promise(r => setImmediate(r));

    const stats = engine.getStats();
    assert(stats.jobs_rate_limited >= 1, `Rate limiter fired (dropped ${stats.jobs_rate_limited} jobs)`);
    assert(stats.jobs_enqueued <= 2, `At most 2 jobs enqueued per minute window (got ${stats.jobs_enqueued})`);

    engine.stop();
}

// ═══════════════════════════════════════════════════════════════════════════
//  11. Pause / Resume
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 11. Pause / Resume ────────────────────────────');

{
    const buf = new DemandBuffer();
    DemandBuffer.MAX_PER_WINDOW = 5000;
    const engine = new DemandFlywheelEngine(buf, makeMockFirewall('allow'), {
        max_followups_per_workload: 5,
        max_jobs_per_minute: 1000,
        verification_cadence: 1,
    });
    engine.start();

    await emitN(engine, 3);
    const beforePause = engine.getStats().jobs_enqueued;
    assert(beforePause > 0, `Before pause: jobs enqueued (${beforePause})`);

    engine.pause();
    assert(engine.isPaused === true, 'Engine paused');

    await emitN(engine, 5);
    const whilePaused = engine.getStats().jobs_enqueued;
    assert(whilePaused === beforePause, 'No new jobs while paused');

    engine.resume();
    assert(engine.isPaused === false, 'Engine resumed');

    await emitN(engine, 3);
    const afterResume = engine.getStats().jobs_enqueued;
    assert(afterResume > whilePaused, `Jobs flow again after resume (enqueued ${afterResume})`);

    engine.stop();
}

// ═══════════════════════════════════════════════════════════════════════════
//  12. Failed workloads are not processed
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 12. Failed Workloads Ignored ─────────────────');

{
    const buf = new DemandBuffer();
    DemandBuffer.MAX_PER_WINDOW = 5000;
    const engine = new DemandFlywheelEngine(buf, makeMockFirewall('allow'), {
        max_jobs_per_minute: 1000,
        verification_cadence: 1,
    });
    engine.start();

    engine.emit('workload.completed', makeWorkload({ success: false }));
    await new Promise(r => setImmediate(r));

    assert(engine.getStats().jobs_generated === 0, 'Failed workload generates no follow-ups');

    engine.stop();
}

// ═══════════════════════════════════════════════════════════════════════════
//  13. Stats API completeness
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── 13. Stats API ─────────────────────────────────');

{
    const engine = new DemandFlywheelEngine(new DemandBuffer(), makeMockFirewall('allow'));
    engine.start();
    await emitN(engine, 5);

    const s = engine.getStats();
    assert(typeof s.jobs_generated === 'number', 'stats.jobs_generated is number');
    assert(typeof s.jobs_enqueued === 'number', 'stats.jobs_enqueued is number');
    assert(typeof s.jobs_blocked_by_firewall === 'number', 'stats.jobs_blocked_by_firewall is number');
    assert(typeof s.jobs_rate_limited === 'number', 'stats.jobs_rate_limited is number');
    assert(typeof s.client_prediction_hits === 'number', 'stats.client_prediction_hits is number');
    assert(Array.isArray(s.top_workload_types), 'stats.top_workload_types is array');
    assert(typeof s.completion_events_seen === 'number', 'stats.completion_events_seen is number');
    assert(typeof s.buffer_depth === 'number', 'stats.buffer_depth is number');
    assert(typeof s.paused === 'boolean', 'stats.paused is boolean');
    assert(typeof s.enabled === 'boolean', 'stats.enabled is boolean');
    assert(s.rate_bucket !== undefined, 'stats.rate_bucket present');

    const recent = engine.getRecentJobs();
    assert(Array.isArray(recent), 'getRecentJobs() returns array');

    engine.stop();
}

// ═══════════════════════════════════════════════════════════════════════════
//  Summary
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n── Results ───────────────────────────────────────');
console.log(`   ✅  Passed: ${passed}`);
console.log(`   ❌  Failed: ${failed}`);
if (failed > 0) process.exit(1);
