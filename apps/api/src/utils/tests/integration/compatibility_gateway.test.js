/**
 * Compatibility Gateway — Test Suite
 *
 * Simulates:
 *   100 RPC calls
 *    50 compute jobs
 *    20 webhook events
 *
 * Verifies correct ingestion into DemandBuffer,
 * abuse firewall enforcement, and stats accuracy.
 */

import { DemandBuffer } from '../../../queue/demand_buffer.js';
import { CompatibilityGateway } from '../../../gateway/compatibility_gateway.js';
import { GatewayAbuseFirewall } from '../../../gateway/compatibility/abuse_firewall.js';
import { normalizeEthRpc, normalizeComputeJob, normalizeWebhook } from '../../../gateway/compatibility/normalizers.js';

let passed = 0, failed = 0;
function assert(cond, msg) {
    if (cond) { console.log(`  ✅  ${msg}`); passed++; }
    else { console.error(`  ❌  ${msg}`); failed++; }
}

// ─────────────────────────────────────────────────────────────────────────────
//  1. Normalizers
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Normalizers ──────────────────────────────────');

const rpcBody = { jsonrpc: '2.0', method: 'eth_call', params: [{ to: '0xabc' }], id: 1 };
const normalized = normalizeEthRpc(rpcBody, 'client-001');
assert(normalized.op_type === 'rpc_call', 'eth_call maps to op_type=rpc_call');
assert(normalized.target === 'ethereum', 'default chain = ethereum');
assert(normalized.payload.method === 'eth_call', 'method preserved in payload');
assert(normalized.reward > 0, 'reward assigned');

// Chain override
const polyRpc = normalizeEthRpc({ ...rpcBody, chain: 'polygon' }, 'cli-2');
assert(polyRpc.target === 'polygon', 'chain override works');

// Compute job — ai_inference
const aiBody = { type: 'ai_inference', model: 'gpt-4', input: 'hello' };
const aiWorkload = normalizeComputeJob(aiBody, 'client-002');
assert(aiWorkload.op_type === 'ai_inference', 'ai_inference op_type');
assert(aiWorkload.target === 'gpt-4', 'model = target');
assert(aiWorkload.payload.input === 'hello', 'input preserved');

// Compute job — data_processing
const dpWorkload = normalizeComputeJob({ type: 'data_processing', input: {} }, 'cli-dp');
assert(dpWorkload.op_type === 'data_processing', 'data_processing op_type');

// Webhook
const whBody = { url: 'https://hooks.test.dev', event: 'deploy', payload: { v: 1 } };
const whWorkload = normalizeWebhook(whBody, 'client-003');
assert(whWorkload.op_type === 'webhook_delivery', 'webhook op_type');
assert(whWorkload.target === 'https://hooks.test.dev', 'url as target');
assert(whWorkload.payload.event === 'deploy', 'event preserved');

// Webhook without url fallback to event
const whNoUrl = normalizeWebhook({ event: 'push', payload: {} }, 'cli-x');
assert(whNoUrl.target === 'push', 'webhook event as target when url absent');

// ─────────────────────────────────────────────────────────────────────────────
//  2. Abuse Firewall
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Abuse Firewall ───────────────────────────────');
const fw = new GatewayAbuseFirewall();

assert(fw.check('cli-a', 'rpc').ok === true, 'first rpc check passes');
assert(!fw.isBanned('cli-a'), 'cli-a not banned');

fw.ban('bad-actor');
assert(fw.check('bad-actor', 'rpc').ok === false, 'banned client rejected');
assert(fw.isBanned('bad-actor'), 'bad-actor is banned');

fw.unban('bad-actor');
assert(!fw.isBanned('bad-actor'), 'unban works');

// Rate limit enforcement — compute limit is 50/min
const fwRl = new GatewayAbuseFirewall();
for (let i = 0; i < 50; i++) fwRl.check('heavy-user', 'compute');
const rlResult = fwRl.check('heavy-user', 'compute');
assert(rlResult.ok === false, 'compute rate limit enforced at 50 req/window');
assert(rlResult.reason.includes('rate limit'), 'reason contains "rate limit"');

// Different type = different bucket
assert(fwRl.check('heavy-user', 'rpc').ok === true, 'rpc bucket independent of compute');

// Reset clears bucket
fwRl.reset('heavy-user', 'compute');
assert(fwRl.check('heavy-user', 'compute').ok === true, 'reset clears rate limit');

const fwStats = fw.stats();
assert(typeof fwStats.tracked_clients === 'number', 'firewall stats.tracked_clients');
assert(typeof fwStats.banned_clients === 'number', 'firewall stats.banned_clients');

// ─────────────────────────────────────────────────────────────────────────────
//  3. Gateway — 100 RPC + 50 Compute + 20 Webhook
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── 100 RPC + 50 Compute + 20 Webhook ───────────');

// Raise DemandBuffer rate limit so the burst doesn't hit it
DemandBuffer.MAX_PER_WINDOW = 500;

const buffer = new DemandBuffer();
const gateway = new CompatibilityGateway(buffer);

const ETH_METHODS = ['eth_call', 'eth_blockNumber', 'eth_getBalance', 'eth_getLogs'];
let rpcAccepted = 0, rpcRejected = 0;

// 100 RPC calls from 10 different clients
for (let i = 0; i < 100; i++) {
    const clientId = `rpc-client-${i % 10}`;
    const method = ETH_METHODS[i % ETH_METHODS.length];
    const res = gateway.handleEthRpc({ jsonrpc: '2.0', method, params: [], id: i }, clientId);
    if (res.ok) rpcAccepted++; else rpcRejected++;
}

assert(rpcAccepted > 0, `RPC: ${rpcAccepted} accepted`);
assert(rpcAccepted + rpcRejected === 100, 'RPC: total handled = 100');

let computeAccepted = 0;
// 50 compute jobs from 5 clients
for (let i = 0; i < 50; i++) {
    const res = gateway.handleComputeJob(
        { type: 'ai_inference', model: 'gpt-4', input: `prompt_${i}` },
        `compute-client-${i % 5}`
    );
    if (res.ok) computeAccepted++;
}
assert(computeAccepted > 0, `Compute: ${computeAccepted} accepted`);
assert(computeAccepted <= 50, 'Compute: ≤50 total');

let webhookAccepted = 0;
// 20 webhook events
for (let i = 0; i < 20; i++) {
    const res = gateway.handleWebhook(
        { url: `https://hooks.test.dev/${i}`, event: 'deploy', payload: { version: i } },
        `wh-client-${i % 3}`
    );
    if (res.ok) webhookAccepted++;
}
assert(webhookAccepted > 0, `Webhook: ${webhookAccepted} accepted`);

// Total buffer should have all accepted workloads
const bufDepth = buffer.size();
const totalAcc = rpcAccepted + computeAccepted + webhookAccepted;
assert(bufDepth === totalAcc, `Buffer depth ${bufDepth} === total accepted ${totalAcc}`);

// ─────────────────────────────────────────────────────────────────────────────
//  4. Validation / Rejection Cases
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Validation & Rejection ───────────────────────');

// RPC — unsupported method
const badMethod = gateway.handleEthRpc({ jsonrpc: '2.0', method: 'debug_traceTransaction', params: [] }, 'cli-x');
assert(!badMethod.ok, 'unsupported RPC method rejected');
assert(badMethod.code === 400, 'returns 400 for bad method');

// RPC — missing method
const noMethod = gateway.handleEthRpc({}, 'cli-x');
assert(!noMethod.ok, 'RPC with no method rejected');

// Compute — unknown type
const badType = gateway.handleComputeJob({ type: 'unknown_type', input: 'x' }, 'cli-x');
assert(!badType.ok, 'unknown compute type rejected');

// Compute — null body
const nullComp = gateway.handleComputeJob(null, 'cli-x');
assert(!nullComp.ok, 'null compute body rejected');

// Pause / resume
gateway.pause();
const pausedRpc = gateway.handleEthRpc({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [] }, 'cli-x');
assert(!pausedRpc.ok && pausedRpc.code === 503, 'gateway pause blocks all requests');
gateway.resume();
const afterResume = gateway.handleEthRpc({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [] }, 'cli-ok');
assert(afterResume.ok, 'requests flow after resume');

// ─────────────────────────────────────────────────────────────────────────────
//  5. Stats & Client Tracking
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Stats & Client Tracking ──────────────────────');

const stats = gateway.getStats();
assert(stats.total_requests > 0, 'total_requests > 0');
assert(stats.total_accepted > 0, 'total_accepted > 0');
assert(stats.total_rejected >= 0, 'total_rejected tracked');
assert(stats.accepted_by_type.rpc > 0, 'accepted_by_type.rpc tracked');
assert(stats.accepted_by_type.compute > 0, 'accepted_by_type.compute tracked');
assert(stats.accepted_by_type.webhook > 0, 'accepted_by_type.webhook tracked');
assert(typeof stats.buffer_depth === 'number', 'buffer_depth in stats');
assert(stats.paused === false, 'paused = false after resume');

const clients = gateway.getClients();
assert(clients.length > 0, 'clients list non-empty');
assert(clients[0].client_id !== undefined, 'client entry has client_id');
assert(typeof clients[0].requests === 'number', 'client entry has requests count');

// ─────────────────────────────────────────────────────────────────────────────
//  6. DemandBuffer integration — drain and verify structure
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── DemandBuffer Integration ─────────────────────');

const drained = buffer.drain(200);
assert(drained.length > 0, 'drain() returns workloads');
assert(drained.every(w => w.op_type !== undefined), 'all workloads have op_type');
assert(drained.every(w => w.target !== undefined), 'all workloads have target');
assert(drained.every(w => typeof w.reward === 'number'), 'all workloads have numeric reward');

// Verify op_type distribution
const ops = drained.map(w => w.op_type);
assert(ops.includes('rpc_call'), 'rpc_call op_type in buffer');
assert(ops.includes('ai_inference'), 'ai_inference op_type in buffer');
assert(ops.includes('webhook_delivery'), 'webhook_delivery op_type in buffer');

// ─────────────────────────────────────────────────────────────────────────────
//  Results
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Results ──────────────────────────────────────');
console.log(`   ✅  Passed: ${passed}`);
console.log(`   ❌  Failed: ${failed}`);
if (failed > 0) process.exit(1);
