#!/usr/bin/env node
/**
 * Workload Generator — 72-hour Endurance Test
 *
 * Generates ~20 operations per second across 4 workload categories,
 * simulating real DePIN traffic through the economic pipeline.
 *
 * Usage:
 *   API_BASE=http://localhost:8080 ADMIN_TOKEN=... node scripts/generate_workloads.js
 *
 * Environment:
 *   API_BASE — backend URL (default: http://localhost:8080)
 *   ADMIN_TOKEN — JWT with admin role for /api/admin/ledger/execute
 *   OPS_PER_SECOND — target operations per second (default: 20)
 */

const API_BASE = process.env.API_BASE || 'http://localhost:8080';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const OPS_PER_SECOND = parseInt(process.env.OPS_PER_SECOND || '20', 10);

// Workload categories mapped to supported op_types
const WORKLOAD_TYPES = [
    { category: 'rpc_call',         op_type: 'api_relay_execution',             weight: 8 },
    { category: 'ai_inference',     op_type: 'routing_decision_compute',        weight: 4 },
    { category: 'data_processing',  op_type: 'verification_op',                 weight: 4 },
    { category: 'automation_job',   op_type: 'automation_job_execute',           weight: 4 },
];

// Simulated client and node pools
const CLIENT_IDS = Array.from({ length: 5 }, (_, i) => `sim-client-${i}`);
const NODE_IDS = Array.from({ length: 10 }, (_, i) => `sim-node-${i}`);

// Counters
const stats = {
    startTime: Date.now(),
    total: 0,
    success: 0,
    errors: 0,
    rateLimited: 0,
    byCategory: {},
};
WORKLOAD_TYPES.forEach(w => { stats.byCategory[w.category] = { sent: 0, ok: 0, err: 0 }; });

// Pick a random element
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Generate unique request ID
let reqCounter = 0;
const requestId = () => `sim-${Date.now()}-${++reqCounter}`;

// Weighted random workload selection
function pickWorkload() {
    const totalWeight = WORKLOAD_TYPES.reduce((s, w) => s + w.weight, 0);
    let r = Math.random() * totalWeight;
    for (const w of WORKLOAD_TYPES) {
        r -= w.weight;
        if (r <= 0) return w;
    }
    return WORKLOAD_TYPES[0];
}

// Submit one operation via the ledger execute endpoint
async function submitOp(workload) {
    const body = {
        op_type: workload.op_type,
        node_id: pick(NODE_IDS),
        client_id: pick(CLIENT_IDS),
        request_id: requestId(),
        timestamp: Math.floor(Date.now() / 1000),
        payload_hash: `sim-${Math.random().toString(36).slice(2, 14)}`,
    };

    stats.total++;
    stats.byCategory[workload.category].sent++;

    try {
        const res = await fetch(`${API_BASE}/api/admin/ledger/execute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(ADMIN_TOKEN ? { Authorization: `Bearer ${ADMIN_TOKEN}` } : {}),
            },
            body: JSON.stringify(body),
        });

        if (res.ok) {
            stats.success++;
            stats.byCategory[workload.category].ok++;
        } else if (res.status === 429) {
            stats.rateLimited++;
            stats.byCategory[workload.category].err++;
        } else {
            stats.errors++;
            stats.byCategory[workload.category].err++;
            if (stats.errors <= 5) {
                const text = await res.text();
                console.error(`[Workload] ${workload.op_type} ${res.status}: ${text.slice(0, 120)}`);
            }
        }
    } catch (e) {
        stats.errors++;
        stats.byCategory[workload.category].err++;
        if (stats.errors <= 5) {
            console.error(`[Workload] ${workload.op_type} error: ${e.message}`);
        }
    }
}

// Print periodic summary
function printSummary() {
    const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(0);
    const rate = (stats.total / Math.max(1, elapsed)).toFixed(1);
    console.log(`\n── Workload Generator (${elapsed}s, ${rate} ops/s) ──`);
    console.log(`  Total: ${stats.total}  |  OK: ${stats.success}  |  Err: ${stats.errors}  |  RateLimited: ${stats.rateLimited}`);
    for (const [cat, s] of Object.entries(stats.byCategory)) {
        console.log(`  ${cat.padEnd(18)} sent=${s.sent}  ok=${s.ok}  err=${s.err}`);
    }
    console.log('');
}

// Main loop
async function main() {
    console.log(`\n=== Satelink Workload Generator ===`);
    console.log(`  API:      ${API_BASE}`);
    console.log(`  Rate:     ${OPS_PER_SECOND} ops/s`);
    console.log(`  Clients:  ${CLIENT_IDS.length}`);
    console.log(`  Nodes:    ${NODE_IDS.length}`);
    console.log(`  Token:    ${ADMIN_TOKEN ? 'provided' : 'MISSING — set ADMIN_TOKEN'}\n`);

    if (!ADMIN_TOKEN) {
        console.warn('WARNING: No ADMIN_TOKEN set. Requests will likely 401.\n');
    }

    const intervalMs = 1000 / OPS_PER_SECOND;

    // Stagger ops to maintain steady rate
    const tick = () => {
        const workload = pickWorkload();
        submitOp(workload); // fire-and-forget for throughput
    };

    const interval = setInterval(tick, intervalMs);

    // Summary every 60 seconds
    const summaryInterval = setInterval(printSummary, 60000);

    // Graceful shutdown
    const shutdown = () => {
        console.log('\nShutting down workload generator...');
        clearInterval(interval);
        clearInterval(summaryInterval);
        printSummary();

        // Write final stats to stdout as JSON for report consumption
        console.log('\n--- WORKLOAD_STATS_JSON ---');
        console.log(JSON.stringify({
            elapsed_s: Math.floor((Date.now() - stats.startTime) / 1000),
            ...stats,
            startTime: undefined,
        }));

        process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    console.log(`Generating workloads. Ctrl+C to stop.\n`);
}

main().catch(e => {
    console.error('Fatal:', e);
    process.exit(1);
});
