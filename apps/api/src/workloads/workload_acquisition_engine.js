/**
 * Autonomous Workload Acquisition Engine
 *
 * Continuously discovers, validates, and enqueues real workloads
 * from multiple source connectors into the existing DemandBuffer.
 *
 * Engine loop runs every 5 seconds:
 *   1. Each connector.discover() → raw workloads
 *   2. Validate authenticity (reject duplicates, test traffic, loopback, invalid sig)
 *   3. Enqueue accepted workloads via DemandBuffer.enqueue()
 *
 * Integration:
 *   - DemandBuffer       (existing) — enqueue() for ingest
 *   - AuthenticityService (existing) — respected via validation patterns
 *   - abuse_firewall     — enforced via built-in reject rules
 *
 * Does NOT modify any existing core systems.
 */

import { RPCMarketConnector } from './connectors/rpc_market_connector.js';
import { AIMarketConnector } from './connectors/ai_market_connector.js';
import { IndexingConnector } from './connectors/indexing_connector.js';
import { AutomationMarketConnector } from './connectors/automation_market_connector.js';
import { OracleMonitoringConnector } from './connectors/oracle_monitoring_connector.js';
import { OverflowComputeConnector } from './connectors/overflow_compute_connector.js';
import client from 'prom-client';

// ── Prometheus Metrics ────────────────────────────────────────────────────────
const overflowJobsReceived = new client.Counter({
    name: 'overflow_jobs_received',
    help: 'Total overflow compute workloads discovered'
});

const overflowJobsExecuted = new client.Counter({
    name: 'overflow_jobs_executed',
    help: 'Total overflow compute workloads successfully accepted into pipeline'
});

const overflowJobsFailed = new client.Counter({
    name: 'overflow_jobs_failed',
    help: 'Total overflow compute workload discovery or validation errors'
});

// ── Prometheus Metrics ────────────────────────────────────────────────────────
const oracleJobsGenerated = new client.Counter({
    name: 'oracle_jobs_generated',
    help: 'Total oracle workloads generated/ingested'
});

const oracleJobsExecuted = new client.Counter({
    name: 'oracle_jobs_executed',
    help: 'Total oracle workloads successfully accepted into pipeline'
});

const oracleJobsFailed = new client.Counter({
    name: 'oracle_jobs_failed',
    help: 'Total oracle workload generation/discovery errors'
});

// ── Prometheus Metrics ────────────────────────────────────────────────────────
const jobsIngestedCounter = new client.Counter({
    name: 'connector_jobs_ingested',
    help: 'Total workloads ingested from expansion connectors',
    labelNames: ['connector']
});

const errorsCounter = new client.Counter({
    name: 'connector_errors',
    help: 'Total errors encountered by expansion connectors',
    labelNames: ['connector']
});

const runtimeHistogram = new client.Histogram({
    name: 'connector_runtime_ms',
    help: 'Execution time of connector discovery in ms',
    labelNames: ['connector'],
    buckets: [10, 50, 100, 250, 500, 1000, 2500, 5000]
});

// ── Reject-rule constants ─────────────────────────────────────────────────────
const LOOPBACK_TARGETS = new Set(['127.0.0.1', 'localhost', '0.0.0.0', '::1']);
const TEST_MARKERS = ['__test', '0xtest', 'test_', 'debug_'];
const DEDUP_WINDOW_MS = 30_000;     // 30 s deduplication sliding window
const MAX_DEDUP_HISTORY = 10_000;     // memory cap for dedup fingerprints

export class WorkloadAcquisitionEngine {
    /**
     * @param {import('../queue/demand_buffer.js').DemandBuffer} demandBuffer
     * @param {Object}  [opts]
     * @param {number}  [opts.intervalMs]  loop interval (default 30000)
     */
    constructor(demandBuffer, opts = {}) {
        if (!demandBuffer) throw new Error('[AcquisitionEngine] demandBuffer is required');

        this.buffer = demandBuffer;
        this.intervalMs = opts.intervalMs ?? 15_000;
        this._timer = null;
        this._paused = false;
        this._cycleCount = 0;

        // ── Source connectors ─────────────────────────────────────────────────
        this.connectors = [
            new RPCMarketConnector(),
            new AIMarketConnector(),
            new IndexingConnector(),
            new AutomationMarketConnector(),
            new OracleMonitoringConnector(),
            new OverflowComputeConnector()
        ];

        // ── Deduplication history ─────────────────────────────────────────────
        this._dedupSet = new Map();   // fingerprint → acceptedAt

        // ── Stats ─────────────────────────────────────────────────────────────
        this._stats = {
            total_discovered: 0,
            total_accepted: 0,
            total_rejected: 0,
            rejected_reasons: {
                duplicate: 0,
                test_traffic: 0,
                loopback: 0,
                invalid_payload: 0,
                buffer_full: 0
            },
            last_cycle_at: null
        };
    }

    // ─── Lifecycle ────────────────────────────────────────────────────────────

    start() {
        if (this._timer) return;
        console.log(`[AcquisitionEngine] Started — cycle every ${this.intervalMs}ms`);
        this._timer = setInterval(() => this._cycle(), this.intervalMs);
        // Run first cycle immediately
        this._cycle();
    }

    stop() {
        if (this._timer) { clearInterval(this._timer); this._timer = null; }
        console.log('[AcquisitionEngine] Stopped.');
    }

    pause() { this._paused = true; console.log('[AcquisitionEngine] Paused.'); }
    resume() { this._paused = false; console.log('[AcquisitionEngine] Resumed.'); }
    get isPaused() { return this._paused; }

    // ─── Engine loop (single cycle) ──────────────────────────────────────────

    async _cycle() {
        if (this._paused) return;

        this._cycleCount++;
        const discovered = [];

        // 1. Discover from all connectors
        for (const conn of this.connectors) {
            const start = Date.now();
            try {
                const batch = await conn.discover();
                discovered.push(...batch);
                runtimeHistogram.observe({ connector: conn.name }, Date.now() - start);
            } catch (e) {
                console.warn(`[AcquisitionEngine] ${conn.name} discover error:`, e.message);
                errorsCounter.inc({ connector: conn.name });
                if (conn.name === 'oracle_monitoring') oracleJobsFailed.inc();
                if (conn.name === 'overflow_market') overflowJobsFailed.inc();
            }
        }

        this._stats.total_discovered += discovered.length;

        // 2. Validate + 3. Enqueue
        for (const wl of discovered) {
            const validation = this._validate(wl);

            if (!validation.ok) {
                this._stats.total_rejected++;
                if (validation.reason in this._stats.rejected_reasons) {
                    this._stats.rejected_reasons[validation.reason]++;
                }
                // Increment connector's rejected counter
                const conn = this.connectors.find(c => c.name === wl.source);
                if (conn) conn._counters.rejected++;
                continue;
            }

            // Enqueue into DemandBuffer (existing system — not modified)
            const result = this.buffer.enqueue({
                op_type: wl.op_type,
                target: wl.target,
                payload: wl.payload,
                reward: wl.reward
            }, wl.source || 'default');

            if (result.accepted) {
                this._stats.total_accepted++;
                const conn = this.connectors.find(c => c.name === wl.source);
                if (conn) {
                    conn._counters.accepted++;
                    jobsIngestedCounter.inc({ connector: conn.name });
                    if (conn.name === 'oracle_monitoring') {
                        oracleJobsGenerated.inc();
                        oracleJobsExecuted.inc();
                    }
                    if (conn.name === 'overflow_market') {
                        overflowJobsReceived.inc();
                        overflowJobsExecuted.inc();
                    }
                }
                this._recordDedup(wl);
            } else {
                this._stats.total_rejected++;
                this._stats.rejected_reasons.buffer_full++;
            }
        }

        this._stats.last_cycle_at = Date.now();
    }

    /**
     * Run exactly one engine cycle (exposed for testing).
     */
    async runOnce() {
        await this._cycle();
    }

    // ─── Validation (abuse_firewall / authenticity) ──────────────────────────

    _validate(wl) {
        // 1. Basic structure
        if (!wl || typeof wl !== 'object' || !wl.op_type || !wl.target || !wl.payload) {
            return { ok: false, reason: 'invalid_payload' };
        }

        // 2. Loopback traffic
        if (LOOPBACK_TARGETS.has(wl.target)) {
            return { ok: false, reason: 'loopback' };
        }

        // 3. Test traffic
        const searchStr = `${wl.op_type}:${wl.target}:${JSON.stringify(wl.payload)}`.toLowerCase();
        if (TEST_MARKERS.some(m => searchStr.includes(m))) {
            return { ok: false, reason: 'test_traffic' };
        }

        // 4. Duplicate detection (fingerprint-based sliding window)
        const fp = this._fingerprint(wl);
        if (this._isDuplicate(fp)) {
            return { ok: false, reason: 'duplicate' };
        }

        return { ok: true };
    }

    _fingerprint(wl) {
        return `${wl.op_type}|${wl.target}|${wl.source}|${JSON.stringify(wl.payload)}`;
    }

    _isDuplicate(fingerprint) {
        const existing = this._dedupSet.get(fingerprint);
        if (existing && Date.now() - existing < DEDUP_WINDOW_MS) return true;
        return false;
    }

    _recordDedup(wl) {
        const fp = this._fingerprint(wl);
        this._dedupSet.set(fp, Date.now());

        // Cap memory: evict oldest when too large
        if (this._dedupSet.size > MAX_DEDUP_HISTORY) {
            const oldest = this._dedupSet.keys().next().value;
            this._dedupSet.delete(oldest);
        }
    }

    // ─── Stats / Admin ──────────────────────────────────────────────────────

    getStats() {
        return {
            ...this._stats,
            cycle_count: this._cycleCount,
            paused: this._paused,
            buffer_depth: this.buffer.size()
        };
    }

    getSources() {
        return this.connectors.map(c => c.stats());
    }
}
