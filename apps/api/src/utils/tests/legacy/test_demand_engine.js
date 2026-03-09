/**
 * Autonomous Workload Acquisition Engine — Smoke Test
 * Covers all 7 modules without requiring Redis or a live server.
 */

import Database from 'better-sqlite3';
import { RpcAdapter } from '../../../queue/adapters/rpc_adapter.js';
import { WebhookAdapter } from '../../../queue/adapters/webhook_adapter.js';
import { AiAdapter } from '../../../queue/adapters/ai_adapter.js';
import { AutomationAdapter } from '../../../queue/adapters/automation_adapter.js';
import { DemandBuffer } from '../../../queue/demand_buffer.js';
import { DemandMetrics } from '../../../monitoring/demand_metrics.js';
import { WorkloadAcquisitionEngine } from '../../../scheduler/workload_acquisition_engine.js';
import { DemandRouter } from '../../../queue/demand_router.js';

const db = new Database(':memory:');

let passed = 0, failed = 0;

function assert(condition, msg) {
    if (condition) { console.log(`  ✅  ${msg}`); passed++; }
    else { console.error(`  ❌  ${msg}`); failed++; }
}

// ──────────────────────────────────────────────────────────────────────────────
//  MODULE 2 — Adapters
// ──────────────────────────────────────────────────────────────────────────────
console.log('\n── Module 2a: RPC Adapter ───────────────────────');
const rpc = new RpcAdapter();
const rpcWork = rpc.normalise({ method: 'eth_blockNumber', chain: 'ethereum' });
assert(rpcWork.op_type === 'rpc_call', 'normalises to op_type=rpc_call');
assert(rpcWork.target === 'ethereum', 'target = chain');
assert(rpcWork.reward > 0, 'default reward assigned');
assert(rpc.canHandle({ method: 'eth_call' }), 'canHandle() true for rpc_call');
assert(!rpc.canHandle({ event: 'push' }), 'canHandle() false for non-rpc');

console.log('\n── Module 2b: Webhook Adapter ───────────────────');
const wh = new WebhookAdapter();
const whWork = wh.normalise({ event: 'payment.succeeded', data: { amount: 100 }, source: 'stripe' });
assert(whWork.op_type === 'webhook_delivery', 'normalises to webhook_delivery');
assert(whWork.payload.event === 'payment.succeeded', 'event preserved in payload');
assert(wh.canHandle({ event: 'push', data: {} }), 'canHandle() true for webhook');

let caught = false;
try { wh.normalise({ event: 'test', data: 'x' }); } catch (e) { caught = true; }
assert(caught, 'rejects non-object data');

console.log('\n── Module 2c: AI Adapter ────────────────────────');
const ai = new AiAdapter();
const aiWork = ai.normalise({ model: 'gpt-4', prompt: 'Hello', params: { temperature: 0.7 } });
assert(aiWork.op_type === 'ai_inference', 'normalises to ai_inference');
assert(aiWork.payload.model === 'gpt-4', 'model preserved');
assert(aiWork.reward > 0, 'default reward assigned');
assert(!ai.canHandle({ event: 'x' }), 'canHandle() false for non-ai');

console.log('\n── Module 2d: Automation Adapter ────────────────');
const auto = new AutomationAdapter();
const autoWork = auto.normalise({ trigger_type: 'cron', action: 'sync.database', schedule: '*/5 * * * *' });
assert(autoWork.op_type === 'automation_job', 'normalises to automation_job');
assert(autoWork.payload.schedule === '*/5 * * * *', 'schedule preserved');

caught = false;
try { auto.normalise({ trigger_type: 'invalid', action: 'x' }); } catch (e) { caught = true; }
assert(caught, 'rejects unsupported trigger_type');

// ──────────────────────────────────────────────────────────────────────────────
//  MODULE 5 — Demand Buffer + MODULE 6 — Safety Limits
// ──────────────────────────────────────────────────────────────────────────────
console.log('\n── Module 5+6: Demand Buffer & Safety Limits ────');
const buffer = new DemandBuffer();

const goodWorkload = { op_type: 'rpc_call', target: 'ethereum', payload: { method: 'eth_call' }, reward: 0.001 };
const r1 = buffer.enqueue(goodWorkload, 'rpc');
assert(r1.accepted === true, 'valid workload accepted');
assert(buffer.size() === 1, 'buffer depth = 1');

// Payload validation — missing op_type
const r2 = buffer.enqueue({ target: 'x', payload: {}, reward: 0 }, 'rpc');
assert(r2.accepted === false, 'rejects missing op_type');

// Payload size limit
const bigPayload = { op_type: 'rpc_call', target: 'ethereum', payload: { data: 'x'.repeat(11000) }, reward: 0.001 };
const r3 = buffer.enqueue(bigPayload, 'rpc');
assert(r3.accepted === false, 'rejects oversized payload (> 10 KB)');

// Rate limit — fill up the per-source window
const overrideMax = DemandBuffer.MAX_PER_WINDOW;
for (let i = 0; i < overrideMax; i++) {
    buffer.enqueue({ ...goodWorkload }, 'rpc_rl_test');
}
const rLimited = buffer.enqueue({ ...goodWorkload }, 'rpc_rl_test');
assert(rLimited.accepted === false && rLimited.reason.includes('rate limit'), 'rate limit enforced after MAX_PER_WINDOW');

// Drain
const drained = buffer.drain(2);
assert(drained.length === 2, 'drain() returns correct count');
assert(buffer.size() < DemandBuffer.MAX_PER_WINDOW + 1, 'buffer depth decremented after drain');

// ──────────────────────────────────────────────────────────────────────────────
//  MODULE 4 — Demand Metrics
// ──────────────────────────────────────────────────────────────────────────────
console.log('\n── Module 4: Demand Metrics ─────────────────────');
const metrics = new DemandMetrics(db);
metrics.recordIncoming(5);
metrics.recordServed(3);
metrics.recordUnserved(2);
metrics.setNodeUtilization(75);

const snap = metrics.snapshot();
assert(snap.incoming_demand === 5, 'incoming_demand = 5');
assert(snap.served_demand === 3, 'served_demand = 3');
assert(snap.unserved_demand === 2, 'unserved_demand = 2');
assert(snap.node_utilization === 75, 'node_utilization = 75');

// ──────────────────────────────────────────────────────────────────────────────
//  MODULE 1 — Workload Acquisition Engine
// ──────────────────────────────────────────────────────────────────────────────
console.log('\n── Module 1: Workload Acquisition Engine ────────');
const engine = new WorkloadAcquisitionEngine(db);

// Auto-detection
const s1 = engine.submit({ method: 'eth_blockNumber', chain: 'ethereum' });
assert(s1.accepted && s1.op_type === 'rpc_call', 'auto-detects RPC workload');

const s2 = engine.submit({ model: 'claude-3', prompt: 'Summarise.' });
assert(s2.accepted && s2.op_type === 'ai_inference', 'auto-detects AI workload');

const s3 = engine.submit({ event: 'push', data: { repo: 'satelink' } });
assert(s3.accepted && s3.op_type === 'webhook_delivery', 'auto-detects webhook');

const s4 = engine.submit({ trigger_type: 'cron', action: 'run.job' });
assert(s4.accepted && s4.op_type === 'automation_job', 'auto-detects automation');

// Unknown payload
const s5 = engine.submit({ unknown_field: true });
assert(!s5.accepted, 'rejects unrecognised payload');

// submitNormalised (Ops API integration — Module 7)
const s6 = engine.submitNormalised({ op_type: 'ai_inference', target: 'ai_relay', payload: { q: 1 }, reward: 0.005 }, 'ops_api');
assert(s6.accepted, 'submitNormalised() accepted');

const pending = engine.pendingCount();
assert(pending >= 5, `buffer has ${pending} pending workloads`);

const engineMetrics = engine.getMetrics();
assert(engineMetrics.incoming_demand >= 6, 'incoming_demand tracked across engine');
assert(engineMetrics.unserved_demand >= 1, 'unserved_demand tracked for rejected');

// Flush
const flushed = engine.flush(10);
assert(flushed.length >= 5, `flush() returned ${flushed.length} workloads`);
assert(engine.pendingCount() === 0, 'buffer empty after flush');

// ──────────────────────────────────────────────────────────────────────────────
//  MODULE 3 — Demand Router
// ──────────────────────────────────────────────────────────────────────────────
console.log('\n── Module 3: Demand Router ──────────────────────');
const dispatchedJobs = [];
const mockPipeline = {
    push_job: async (job) => {
        dispatchedJobs.push(job);
    }
};

const routerMetrics = new DemandMetrics(db);
const engine2 = new WorkloadAcquisitionEngine(db);
const demandRouter = new DemandRouter(engine2, mockPipeline, routerMetrics);

// Submit 3 workloads then dispatch
engine2.submit({ method: 'eth_call', chain: 'ethereum' });
engine2.submit({ model: 'llama', prompt: 'Hello' });
engine2.submit({ event: 'deploy', data: { env: 'prod' } });

const dispResult = await demandRouter.dispatch();
assert(dispResult.dispatched === 3, `dispatched 3 workloads (got ${dispResult.dispatched})`);
assert(dispResult.errors === 0, 'zero dispatch errors');
assert(dispatchedJobs.length === 3, 'jobs received by mock pipeline');
assert(dispatchedJobs[0].is_demand_job, 'jobs tagged is_demand_job=true');
assert(dispatchedJobs[0].is_universal_op, 'jobs tagged is_universal_op=true');

// Priority mapping
const aiJob = dispatchedJobs.find(j => j.type === 'ai_inference');
assert(aiJob && aiJob.priority === 'enterprise', 'ai_inference maps to enterprise priority');
const rpcJob = dispatchedJobs.find(j => j.type === 'rpc_call');
assert(rpcJob && rpcJob.priority === 'developer', 'rpc_call maps to developer priority');

// ──────────────────────────────────────────────────────────────────────────────
//  MODULE 7 — Ops API integration (submitNormalised path)
// ──────────────────────────────────────────────────────────────────────────────
console.log('\n── Module 7: Ops API Integration ────────────────');
const engine3 = new WorkloadAcquisitionEngine(db);
const norm = engine3.submitNormalised({ op_type: 'webhook_delivery', target: 'my-webhook', payload: { event: 'test' }, reward: 0.001 }, 'ops_api');
assert(norm.accepted, 'submitNormalised() accepted by engine');
const drained3 = engine3.flush(1);
assert(drained3.length === 1, 'normalised workload drained correctly');
assert(drained3[0].op_type === 'webhook_delivery', 'op_type preserved through ops_api path');

// ──────────────────────────────────────────────────────────────────────────────
//  Results
// ──────────────────────────────────────────────────────────────────────────────
console.log('\n── Results ──────────────────────────────────────');
console.log(`   ✅  Passed: ${passed}`);
console.log(`   ❌  Failed: ${failed}`);
if (failed > 0) process.exit(1);
