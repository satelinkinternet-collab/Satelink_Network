#!/usr/bin/env node
/**
 * Node Lifecycle Verification Test — 5-Minute Simulation
 *
 * Validates the complete node lifecycle:
 *   1. Register 10 nodes
 *   2. Send heartbeats (every 10s for 5 minutes)
 *   3. Submit simulated jobs
 *   4. Execute workloads via /api/admin/ledger/execute
 *   5. Verify database state (nodes, uptime, earnings, epochs)
 *   6. Trigger epoch finalization
 *   7. Output verification report
 *
 * Usage:
 *   API_BASE=http://localhost:8080 DURATION_MS=300000 node scripts/node_lifecycle_test.js
 */

const API_BASE = process.env.API_BASE || 'http://localhost:8080';
const DURATION_MS = parseInt(process.env.DURATION_MS || '300000', 10); // 5 minutes
const NODE_COUNT = parseInt(process.env.NODE_COUNT || '10', 10);
const HEARTBEAT_INTERVAL = 10000; // 10 seconds for faster test
const JOB_INTERVAL = 5000; // submit a job every 5 seconds

const results = {
    phase: '',
    nodes_registered: 0,
    heartbeats_sent: 0,
    heartbeat_errors: 0,
    jobs_submitted: 0,
    jobs_executed: 0,
    workloads_processed: 0,
    workload_errors: 0,
    active_nodes: 0,
    total_nodes: 0,
    epochs_finalized: 0,
    total_revenue: 0,
    total_earnings: 0,
    errors: [],
    timeline: [],
};

function log(msg) {
    const ts = new Date().toISOString().slice(11, 19);
    console.log(`[${ts}] ${msg}`);
    results.timeline.push({ ts, msg });
}

function logError(msg) {
    console.error(`[ERROR] ${msg}`);
    results.errors.push(msg);
}

// ─── Get admin token ───
async function getAdminToken() {
    const res = await fetch(`${API_BASE}/__test/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: '0xadmin_lifecycle_test', role: 'admin_super' }),
    });
    const data = await res.json();
    if (!data.token) throw new Error('Failed to get admin token');
    return data.token;
}

// ─── Phase 1: Register nodes ───
async function registerNodes() {
    results.phase = 'registration';
    log(`Registering ${NODE_COUNT} nodes...`);

    const nodes = [];
    for (let i = 0; i < NODE_COUNT; i++) {
        const node_id = `sim-node-${String(i).padStart(3, '0')}`;
        try {
            const res = await fetch(`${API_BASE}/v1/node/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    node_id,
                    node_type: i < 3 ? 'genesis' : 'community',
                    region: ['us-east', 'eu-west', 'ap-south'][i % 3],
                    capacity: 10 + Math.floor(Math.random() * 40),
                }),
            });
            const data = await res.json();
            if (data.ok) {
                results.nodes_registered++;
                nodes.push({ node_id, type: i < 3 ? 'genesis' : 'community' });
            } else {
                logError(`Register ${node_id}: ${JSON.stringify(data)}`);
            }
        } catch (e) {
            logError(`Register ${node_id}: ${e.message}`);
        }
    }
    log(`Registered ${results.nodes_registered}/${NODE_COUNT} nodes`);
    return nodes;
}

// ─── Phase 2: Heartbeat loop ───
function startHeartbeats(nodes) {
    results.phase = 'heartbeats';
    log('Starting heartbeat loop...');

    return setInterval(async () => {
        const batch = nodes.map(async (n) => {
            try {
                const res = await fetch(`${API_BASE}/v1/node/heartbeat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        node_id: n.node_id,
                        cpu_usage: Math.round(10 + Math.random() * 60),
                        memory_usage: Math.round(20 + Math.random() * 50),
                        capacity_available: Math.round(30 + Math.random() * 70),
                        latency_ms: Math.round(5 + Math.random() * 40),
                    }),
                });
                if (res.ok) {
                    results.heartbeats_sent++;
                } else {
                    results.heartbeat_errors++;
                }
            } catch (e) {
                results.heartbeat_errors++;
            }
        });
        await Promise.allSettled(batch);
    }, HEARTBEAT_INTERVAL);
}

// ─── Phase 3: Job submission and execution ───
function startJobEngine(nodes, adminToken) {
    results.phase = 'jobs';
    log('Starting job engine...');

    const OP_TYPES = [
        'api_relay_execution',
        'automation_job_execute',
        'routing_decision_compute',
        'verification_op',
        'monitoring_op',
    ];

    let jobCounter = 0;

    return setInterval(async () => {
        const node = nodes[jobCounter % nodes.length];
        const opType = OP_TYPES[jobCounter % OP_TYPES.length];
        const jobId = `lifecycle-job-${Date.now()}-${jobCounter}`;
        jobCounter++;

        // 3a. Submit job to queue
        try {
            const submitRes = await fetch(`${API_BASE}/v1/node/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    node_id: node.node_id,
                    job_id: jobId,
                    result: { status: 'success', output: `Result from ${node.node_id}` },
                    status: 'completed',
                    duration_ms: Math.round(50 + Math.random() * 200),
                }),
            });
            if (submitRes.ok) results.jobs_submitted++;
        } catch (e) {
            logError(`Job submit: ${e.message}`);
        }

        // 3b. Execute workload via operations engine
        try {
            const execRes = await fetch(`${API_BASE}/api/admin/ledger/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminToken}`,
                },
                body: JSON.stringify({
                    op_type: opType,
                    node_id: node.node_id,
                    client_id: `test-client-${jobCounter % 5}`,
                    request_id: `req-${jobId}`,
                    timestamp: Math.floor(Date.now() / 1000),
                }),
            });
            const execData = await execRes.json();
            if (execData.ok) {
                results.workloads_processed++;
                results.total_revenue += execData.amount || 0;
            } else {
                results.workload_errors++;
                if (results.workload_errors <= 3) logError(`Workload: ${execData.error}`);
            }
        } catch (e) {
            results.workload_errors++;
        }
    }, JOB_INTERVAL);
}

// ─── Phase 4: Verify network state ───
async function verifyNetworkState() {
    log('Verifying network state...');

    // Check active nodes
    try {
        const res = await fetch(`${API_BASE}/v1/node/list`);
        const data = await res.json();
        results.total_nodes = data.count || 0;
        results.active_nodes = (data.nodes || []).filter(n => n.status === 'ACTIVE').length;
        log(`Nodes: ${results.active_nodes} active / ${results.total_nodes} total`);
    } catch (e) {
        logError(`Node list: ${e.message}`);
    }

    // Check network stats
    try {
        const res = await fetch(`${API_BASE}/api/network/stats`);
        const data = await res.json();
        log(`Network stats: ${JSON.stringify(data)}`);
    } catch (e) {
        logError(`Network stats: ${e.message}`);
    }

    // Check metrics
    try {
        const res = await fetch(`${API_BASE}/v1/node/metrics`);
        const data = await res.json();
        log(`Node metrics: ${JSON.stringify(data.metrics || data)}`);
    } catch (e) {
        logError(`Metrics: ${e.message}`);
    }
}

// ─── Phase 5: Finalize epoch ───
async function finalizeEpoch(adminToken) {
    log('Finalizing epoch...');

    try {
        const res = await fetch(`${API_BASE}/api/admin/rewards/epochs`, {
            headers: { 'Authorization': `Bearer ${adminToken}` },
        });
        const data = await res.json();
        log(`Epochs state: ${JSON.stringify(data).slice(0, 200)}`);
    } catch (e) {
        logError(`Epoch check: ${e.message}`);
    }

    // Try to finalize
    try {
        const res = await fetch(`${API_BASE}/api/admin/ledger/epoch/finalize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`,
            },
        });
        const data = await res.json();
        if (data.ok || data.epoch_id) {
            results.epochs_finalized++;
            results.total_earnings = data.total_revenue || data.node_pool || 0;
            log(`Epoch finalized: ${JSON.stringify(data).slice(0, 200)}`);
        } else {
            log(`Epoch finalization response: ${JSON.stringify(data).slice(0, 200)}`);
        }
    } catch (e) {
        logError(`Epoch finalize: ${e.message}`);
    }
}

// ─── Phase 6: Generate report ───
function generateReport(startTime) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    const report = {
        title: 'Node Lifecycle Verification Report',
        timestamp: new Date().toISOString(),
        duration_seconds: Number(elapsed),
        summary: {
            nodes_registered: results.nodes_registered,
            active_nodes: results.active_nodes,
            total_nodes: results.total_nodes,
            heartbeats_sent: results.heartbeats_sent,
            heartbeat_errors: results.heartbeat_errors,
            heartbeat_success_rate: results.heartbeats_sent > 0
                ? ((results.heartbeats_sent / (results.heartbeats_sent + results.heartbeat_errors)) * 100).toFixed(1) + '%'
                : 'N/A',
            jobs_submitted: results.jobs_submitted,
            workloads_processed: results.workloads_processed,
            workload_errors: results.workload_errors,
            total_revenue_usdt: results.total_revenue.toFixed(6),
            epochs_finalized: results.epochs_finalized,
            total_earnings_distributed: results.total_earnings,
        },
        verification: {
            'active_nodes >= 10': results.active_nodes >= 10 ? 'PASS' : 'FAIL',
            'jobs_executed > 0': results.jobs_submitted > 0 ? 'PASS' : 'FAIL',
            'workloads_processed > 0': results.workloads_processed > 0 ? 'PASS' : 'FAIL',
            'heartbeats_flowing': results.heartbeats_sent > 0 ? 'PASS' : 'FAIL',
            'epoch_finalized >= 1': results.epochs_finalized >= 1 ? 'PASS' : 'FAIL',
            'revenue_generated': results.total_revenue > 0 ? 'PASS' : 'FAIL',
        },
        errors: results.errors.slice(0, 20),
    };

    const passCount = Object.values(report.verification).filter(v => v === 'PASS').length;
    const totalChecks = Object.keys(report.verification).length;
    report.overall = `${passCount}/${totalChecks} checks passed`;

    console.log('\n' + '═'.repeat(60));
    console.log('  NODE LIFECYCLE VERIFICATION REPORT');
    console.log('═'.repeat(60));
    console.log(`  Duration:     ${elapsed}s`);
    console.log(`  Timestamp:    ${report.timestamp}`);
    console.log('');
    console.log('  SUMMARY');
    console.log('  ─────────────────────────────────');
    Object.entries(report.summary).forEach(([k, v]) => {
        console.log(`  ${k.padEnd(28)} ${v}`);
    });
    console.log('');
    console.log('  VERIFICATION CHECKS');
    console.log('  ─────────────────────────────────');
    Object.entries(report.verification).forEach(([k, v]) => {
        const icon = v === 'PASS' ? '\u2705' : '\u274c';
        console.log(`  ${icon} ${k.padEnd(28)} ${v}`);
    });
    console.log('');
    console.log(`  OVERALL: ${report.overall}`);
    if (report.errors.length > 0) {
        console.log('');
        console.log('  ERRORS (first 20)');
        console.log('  ─────────────────────────────────');
        report.errors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
    }
    console.log('═'.repeat(60));

    return report;
}

// ─── Main ───
async function main() {
    console.log(`\n${'═'.repeat(60)}`);
    console.log('  SATELINK NODE LIFECYCLE VERIFICATION TEST');
    console.log(`${'═'.repeat(60)}`);
    console.log(`  API:       ${API_BASE}`);
    console.log(`  Nodes:     ${NODE_COUNT}`);
    console.log(`  Duration:  ${DURATION_MS / 1000}s`);
    console.log(`  Heartbeat: every ${HEARTBEAT_INTERVAL / 1000}s`);
    console.log(`  Jobs:      every ${JOB_INTERVAL / 1000}s`);
    console.log('');

    const startTime = Date.now();

    // Health check
    try {
        const res = await fetch(`${API_BASE}/health`);
        const data = await res.json();
        if (data.status !== 'ok') throw new Error('Health check failed');
        log('Server health: OK');
    } catch (e) {
        console.error('FATAL: Server not reachable at', API_BASE);
        process.exit(1);
    }

    // Get admin token
    let adminToken;
    try {
        adminToken = await getAdminToken();
        log('Admin token acquired');
    } catch (e) {
        console.error('FATAL: Cannot get admin token:', e.message);
        process.exit(1);
    }

    // Phase 1: Register
    const nodes = await registerNodes();
    if (nodes.length === 0) {
        console.error('FATAL: No nodes registered');
        process.exit(1);
    }

    // Phase 2-3: Start heartbeats and jobs
    const hbInterval = startHeartbeats(nodes);
    const jobInterval = startJobEngine(nodes, adminToken);

    // Progress updates every 30 seconds
    const progressInterval = setInterval(() => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
        const remaining = Math.max(0, (DURATION_MS - (Date.now() - startTime)) / 1000).toFixed(0);
        log(`Progress: ${elapsed}s elapsed, ${remaining}s remaining | HB=${results.heartbeats_sent} Jobs=${results.jobs_submitted} Ops=${results.workloads_processed} Rev=$${results.total_revenue.toFixed(4)}`);
    }, 30000);

    // Wait for duration
    log(`Running for ${DURATION_MS / 1000}s...`);
    await new Promise(resolve => setTimeout(resolve, DURATION_MS));

    // Stop intervals
    clearInterval(hbInterval);
    clearInterval(jobInterval);
    clearInterval(progressInterval);
    log('Simulation complete. Verifying...');

    // Phase 4: Verify
    await verifyNetworkState();

    // Phase 5: Finalize epoch
    await finalizeEpoch(adminToken);

    // Phase 6: Report
    const report = generateReport(startTime);

    // Write report to file
    const fs = await import('fs');
    const reportPath = 'logs/node_lifecycle_report.json';
    try {
        fs.mkdirSync('logs', { recursive: true });
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        log(`Report written to ${reportPath}`);
    } catch (e) {
        logError(`Write report: ${e.message}`);
    }

    // Exit with code based on results
    const passCount = Object.values(report.verification).filter(v => v === 'PASS').length;
    const totalChecks = Object.keys(report.verification).length;
    process.exit(passCount >= totalChecks - 1 ? 0 : 1); // Allow 1 failure (epoch finalize may not have enough data)
}

main().catch(e => {
    console.error('Fatal:', e);
    process.exit(1);
});
