/**
 * Global Gateway Layer — Smoke Test
 * Covers all 6 modules without a live HTTP server.
 */

import Database from 'better-sqlite3';
import { GatewayMetrics } from '../../../gateway/global/gateway_metrics.js';
import { EdgeCache } from '../../../gateway/global/edge_cache.js';
import { GatewayClusterManager } from '../../../gateway/global/gateway_cluster_manager.js';
import { LatencyRouter } from '../../../gateway/global/latency_router.js';
import { TrafficBalancer } from '../../../gateway/global/traffic_balancer.js';
import { GlobalGatewayRouter } from '../../../gateway/global/global_gateway_router.js';

const db = new Database(':memory:');

let passed = 0, failed = 0;
function assert(cond, msg) {
    if (cond) { console.log(`  ✅  ${msg}`); passed++; }
    else { console.error(`  ❌  ${msg}`); failed++; }
}

// Mock pipeline
const jobs = [];
const pipeline = { push_job: async (j) => { jobs.push(j); } };

// ─────────────────────────────────────────────────────────────────────────────
//  MODULE 6 — Gateway Metrics
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Module 6: Gateway Metrics ────────────────────');
const metrics = new GatewayMetrics(db);

metrics.incRequests(5);
metrics.recordLatency(20);
metrics.recordLatency(30);
metrics.incCacheHits(3);
metrics.incRegionalTraffic('us-east');
metrics.incRegionalTraffic('us-east');
metrics.incRegionalTraffic('eu-west');

const mSnap = metrics.snapshot();
assert(mSnap.gateway_requests === 5, 'gateway_requests = 5');
assert(mSnap.cache_hits === 3, 'cache_hits = 3');
assert(mSnap.gateway_latency > 0, 'latency EMA > 0');
assert(mSnap.regional_traffic['us-east'] === 2, 'us-east traffic = 2');
assert(mSnap.regional_traffic['eu-west'] === 1, 'eu-west traffic = 1');

// Persistence round-trip
const metrics2 = new GatewayMetrics(db);
assert(metrics2.snapshot().gateway_requests === 5, 'gateway_requests persisted');
assert(metrics2.snapshot().cache_hits === 3, 'cache_hits persisted');
assert(metrics2.snapshot().regional_traffic['us-east'] === 2, 'regional_traffic persisted');

// ─────────────────────────────────────────────────────────────────────────────
//  MODULE 5 — Edge Cache
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Module 5: Edge Cache ─────────────────────────');
const cache = new EdgeCache();

cache.set('key-a', { result: 42 }, 5000);
cache.set('key-b', { result: 99 }, 1);    // expires in 1 ms

assert(cache.get('key-a')?.result === 42, 'cache.get() returns stored value');
assert(cache.has('key-a') === true, 'cache.has() true for live entry');

// Wait a tick for key-b to expire
await new Promise(r => setTimeout(r, 10));
assert(cache.get('key-b') === null, 'expired entry returns null');

// TTL override by method name
cache.set('/rpc/ethereum:eth_blockNumber:[]', { number: 100 });
assert(cache.has('/rpc/ethereum:eth_blockNumber:[]'), 'eth_blockNumber cached with override TTL');

// Sweep
cache.set('exp-now', 'x', 1);
await new Promise(r => setTimeout(r, 10));
const swept = cache.sweep();
assert(swept >= 1, `sweep removed ≥1 expired entries (got ${swept})`);

// LRU eviction (max_size)
const smallCache = new EdgeCache();
Object.defineProperty(EdgeCache, 'MAX_ENTRIES', { value: 3 });
smallCache.set('k1', 1, 9999); smallCache.set('k2', 2, 9999); smallCache.set('k3', 3, 9999);
smallCache.set('k4', 4, 9999);  // should evict k1
assert(smallCache.get('k1') === null || smallCache.size() <= 3, 'LRU evicts oldest when full');

// ─────────────────────────────────────────────────────────────────────────────
//  MODULE 2 — Gateway Cluster Manager
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Module 2: Gateway Cluster Manager ────────────');
const cluster = new GatewayClusterManager();

// Default gateways seeded
const list = cluster.list();
assert(list.length >= 4, `≥4 default gateways seeded (got ${list.length})`);
assert(list.every(g => g.health_status === 'healthy'), 'all defaults healthy');

// Custom registration
const custom = cluster.register({ gateway_id: 'gw-custom-01', region: 'ap-east', capacity: 200 });
assert(custom.gateway_id === 'gw-custom-01', 'custom gateway registered');
assert(custom.region === 'ap-east', 'custom region correct');

// Heartbeat update
const hb = cluster.heartbeat('gw-custom-01', { current_load: 50, health_status: 'healthy' });
assert(hb.ok === true, 'heartbeat returns ok');
assert(cluster.list().find(g => g.gateway_id === 'gw-custom-01').current_load === 50, 'current_load updated');

// Healthy by region
const usEast = cluster.getHealthy('us-east');
assert(usEast.length >= 1, 'getHealthy(us-east) returns ≥1 gateway');

// Missing gateway heartbeat
const bad = cluster.heartbeat('gw-nonexistent', {});
assert(bad.ok === false, 'heartbeat for unknown gw returns ok:false');

// Cluster metrics
const cMet = cluster.getMetrics();
assert(cMet.total_gateways >= 5, `total_gateways ≥ 5 (got ${cMet.total_gateways})`);
assert(cMet.healthy_gateways >= 5, 'healthy_gateways ≥ 5');
assert(cMet.total_capacity > 0, 'total_capacity > 0');
assert(Array.isArray(cMet.regions), 'regions is array');

// ─────────────────────────────────────────────────────────────────────────────
//  MODULE 3 — Latency Router
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Module 3: Latency Router ─────────────────────');
const router = new LatencyRouter(cluster);

// Explicit region header
const r1 = router.route({ region: 'eu-west' });
assert(r1.region === 'eu-west', 'explicit region header honoured');
assert(r1.method === 'explicit_header', 'method = explicit_header');
assert(typeof r1.latency_estimate_ms === 'number', 'latency_estimate_ms is number');

// IP heuristic — 10.x → us-east
const r2 = router.route({ client_ip: '10.0.0.5' });
assert(r2.region === 'us-east', '10.x IP routed to us-east');
assert(r2.method === 'ip_heuristic', 'method = ip_heuristic');

// Preferred region query param
const r3 = router.route({ preferred_region: 'ap-south' });
assert(r3.region === 'ap-south', 'preferred_region query param honoured');

// Load-balanced fallback (no hints)
const r4 = router.route({});
assert(r4 !== null, 'route() returns non-null even with no hints');
assert(typeof r4.gateway_id === 'string', 'route() returns gateway_id');

// ─────────────────────────────────────────────────────────────────────────────
//  MODULE 4 — Traffic Balancer
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Module 4: Traffic Balancer ───────────────────');
const balancer = new TrafficBalancer(cluster, 'round_robin');

// Round-robin cycles
const gw1 = balancer.next();
const gw2 = balancer.next();
assert(gw1 !== null, 'round_robin returns gateway');
assert(gw2 !== null, 'round_robin second call returns gateway');
assert(gw1.gateway_id !== gw2.gateway_id, 'round_robin cycles to different gateway');

// Latency-weighted — us-east should win (lowest latency)
balancer.setMethod('latency_weighted');
const gwLat = balancer.next();
assert(gwLat !== null, 'latency_weighted returns gateway');
assert(['us-east', 'us-west'].includes(gwLat.region), `latency_weighted picks low-latency region (got ${gwLat.region})`);

// Capacity-weighted
balancer.setMethod('capacity_weighted');
const gwCap = balancer.next();
assert(gwCap !== null, 'capacity_weighted returns gateway');

// Invalid method
let threw = false;
try { balancer.setMethod('invalid'); } catch { threw = true; }
assert(threw, 'setMethod throws for unknown algorithm');

// Region-filtered next()
const gwRegion = balancer.next('eu-west');
assert(gwRegion?.region === 'eu-west', 'region-filtered next() respects region');

// ─────────────────────────────────────────────────────────────────────────────
//  MODULE 1 — Global Gateway Router  (forward + middleware)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Module 1: Global Gateway Router ─────────────');
const gateway = new GlobalGatewayRouter(db, pipeline, cluster, pool);

// Direct forward()
const fwd = await gateway.forward({
    op_type: 'rpc_call', target: 'ethereum',
    payload: { method: 'eth_blockNumber', params: [] },
    reward: 0.0005
});
assert(fwd.ok === true, 'forward() returns ok: true');
assert(typeof fwd.job_id === 'string', 'forward() returns job_id');
assert(jobs.length >= 1, 'forward() pushed job to pipeline');
assert(jobs[0].is_gateway_job === true, 'job tagged is_gateway_job=true');

// Middleware smoke — create a fake req/res/next cycle
const metBefore = gateway.getMetrics().gateway_requests;
let nextCalled = false;
let jsonCalled = false;
const fakeReq = {
    ip: '10.0.0.1',
    method: 'POST',
    path: '/rpc/ethereum',
    headers: {},
    query: {},
    body: { jsonrpc: '2.0', method: 'eth_chainId', params: [], id: 1 }
};
const fakeRes = {
    statusCode: 200,
    status: function (c) { this.statusCode = c; return this; },
    json: function (b) { jsonCalled = true; return this; }
};

const mw = gateway.middleware();
mw(fakeReq, fakeRes, () => { nextCalled = true; });
assert(nextCalled === true, 'middleware calls next()');
assert(fakeReq.gatewayContext !== undefined, 'middleware attaches gatewayContext to req');
assert(typeof fakeReq.gatewayContext.region === 'string', 'gatewayContext.region is string');

// Simulate response write to trigger latency recording
fakeRes.json({ result: '0x1' });

// Gateway metrics updated across both forward() and middleware
const metAfter = gateway.getMetrics();
assert(metAfter.gateway_requests >= metBefore + 1, 'gateway_requests incremented by middleware');
assert(metAfter.cache_hits >= 0, 'cache_hits metric accessible');

// Cache behaviour — same key served from cache on second request
const fakeReq2 = { ...fakeReq, headers: {}, query: {} };
let cachedResponse = null;
const fakeRes2 = {
    statusCode: 200,
    status: function (c) { this.statusCode = c; return this; },
    json: function (b) { cachedResponse = b; return this; }
};
// Prime the cache entry manually
gateway.cache.set('/rpc/ethereum:eth_chainId:[]', { result: '0x1' });
mw(fakeReq2, fakeRes2, () => { });
assert(cachedResponse !== null, 'cache HIT served directly from edge cache');
assert(gateway.getMetrics().cache_hits > metAfter.cache_hits, 'cache_hits incremented on hit');

// Cluster + cache size accessors
assert(typeof gateway.getCluster().total_gateways === 'number', 'getCluster() returns total_gateways');
assert(typeof gateway.getCache().size === 'number', 'getCache() returns size');

// ─────────────────────────────────────────────────────────────────────────────
//  Results
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Results ──────────────────────────────────────');
console.log(`   ✅  Passed: ${passed}`);
console.log(`   ❌  Failed: ${failed}`);
if (failed > 0) process.exit(1);
