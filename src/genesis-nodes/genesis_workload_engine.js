/**
 * Genesis Workload Engine
 *
 * Runs a scheduled loop (every 10 seconds by default) that:
 *   1. Collects workloads from all genesis sources
 *   2. Filters duplicates (fingerprint-based, 60 s window)
 *   3. Validates payloads against DemandBuffer rules
 *   4. Enqueues into demand_buffer
 *
 * This engine produces ONLY legitimate, useful compute tasks —
 * no synthetic filler, no fake traffic.
 *
 * Does NOT modify: demand_buffer, execution_router, abuse_firewall,
 * reputation_engine, or economic_ledger.
 */

import { BlockchainIndexerSource } from './sources/blockchain_indexer_source.js';
import { DataAggregationSource } from './sources/data_aggregation_source.js';
import { VerificationSource } from './sources/verification_source.js';
import { AIMicrotaskSource } from './sources/ai_microtask_source.js';
import { genesisConfig } from '../core/config/genesis_workload_config.js';

const DEDUP_WINDOW_MS = genesisConfig.dedup_window_ms;
const MAX_DEDUP_HISTORY = 20_000;
const DEMAND_SOURCE_KEY = genesisConfig.demand_source_key;

export class GenesisWorkloadEngine {
    /**
     * @param {import('../demand-engine/demand_buffer.js').DemandBuffer} demandBuffer
     * @param {Object}  [opts]
     * @param {number}  [opts.intervalMs]   override interval (default 10 000)
     */
    constructor(demandBuffer, opts = {}) {
        if (!demandBuffer) throw new Error('[GenesisEngine] demandBuffer is required');

        this.buffer = demandBuffer;
        this.intervalMs = opts.intervalMs ?? genesisConfig.generation_interval_seconds * 1_000;
        this._timer = null;
        this._paused = false;
        this._cycleCount = 0;

        // ── Sources ───────────────────────────────────────────────────────────
        const cfg = genesisConfig.sources;
        this.sources = [
            new BlockchainIndexerSource(cfg.blockchain_indexer.batch_size),
            new DataAggregationSource(cfg.data_aggregation.batch_size),
            new VerificationSource(cfg.verification.batch_size),
            new AIMicrotaskSource(cfg.ai_microtask.batch_size)
        ];

        // ── Dedup store ───────────────────────────────────────────────────────
        this._dedupMap = new Map();   // fingerprint → acceptedAt

        // ── Stats ─────────────────────────────────────────────────────────────
        this._stats = {
            workloads_generated: 0,
            workloads_enqueued: 0,
            duplicates_filtered: 0,
            invalid_filtered: 0,
            buffer_full_drops: 0,
            source_distribution: {
                blockchain_indexer: 0,
                data_aggregation: 0,
                verification: 0,
                ai_microtask: 0
            },
            last_cycle_at: null
        };
    }

    // ─── Lifecycle ────────────────────────────────────────────────────────────

    start() {
        if (this._timer) return;
        console.log(`[GenesisEngine] Started — interval ${this.intervalMs}ms`);
        this._timer = setInterval(() => this._cycle(), this.intervalMs);
        this._cycle();    // run immediately on start
    }

    stop() {
        if (this._timer) { clearInterval(this._timer); this._timer = null; }
        console.log('[GenesisEngine] Stopped.');
    }

    pause() { this._paused = true; }
    resume() { this._paused = false; }
    get isPaused() { return this._paused; }

    // ─── Single engine cycle ──────────────────────────────────────────────────

    async _cycle() {
        if (this._paused) return;
        this._cycleCount++;

        const raw = [];

        // 1. Collect from all sources
        for (const src of this.sources) {
            try { raw.push(...src.generate()); }
            catch (e) { console.warn(`[GenesisEngine] ${src.name} error:`, e.message); }
        }
        this._stats.workloads_generated += raw.length;

        // 2. Filter duplicates
        // 3. Validate + enqueue
        for (const wl of raw) {
            // Duplicate check
            const fp = this._fingerprint(wl);
            if (this._isDuplicate(fp)) {
                this._stats.duplicates_filtered++;
                continue;
            }

            // Basic payload validation (mirrors DemandBuffer requirements)
            if (!this._isValid(wl)) {
                this._stats.invalid_filtered++;
                continue;
            }

            // 4. Enqueue into DemandBuffer (existing system — unchanged)
            const result = this.buffer.enqueue({
                op_type: wl.op_type,
                target: wl.target,
                payload: wl.payload,
                reward: wl.reward
            }, DEMAND_SOURCE_KEY);

            if (result.accepted) {
                this._stats.workloads_enqueued++;
                this._stats.source_distribution[wl.source] =
                    (this._stats.source_distribution[wl.source] || 0) + 1;
                this._recordDedup(fp);
            } else {
                this._stats.buffer_full_drops++;
            }
        }

        this._stats.last_cycle_at = Date.now();

        // Periodic dedup cleanup
        if (this._cycleCount % 10 === 0) this._sweepDedup();
    }

    /**
     * Run a single cycle synchronously (for tests).
     */
    async runOnce() { await this._cycle(); }

    // ─── Validation ───────────────────────────────────────────────────────────

    _isValid(wl) {
        const VALID_OP_TYPES = new Set([
            'rpc_call', 'ai_inference', 'automation_job', 'webhook_delivery', 'data_processing'
        ]);
        if (!wl || typeof wl !== 'object') return false;
        if (!VALID_OP_TYPES.has(wl.op_type)) return false;
        if (!wl.target) return false;
        if (!wl.payload || typeof wl.payload !== 'object') return false;
        return true;
    }

    // ─── Deduplication ────────────────────────────────────────────────────────

    _fingerprint(wl) {
        return `${wl.source}|${wl.op_type}|${wl.target}|${JSON.stringify(wl.payload)}`;
    }

    _isDuplicate(fp) {
        const ts = this._dedupMap.get(fp);
        return ts !== undefined && Date.now() - ts < DEDUP_WINDOW_MS;
    }

    _recordDedup(fp) {
        this._dedupMap.set(fp, Date.now());
        if (this._dedupMap.size > MAX_DEDUP_HISTORY) {
            const oldest = this._dedupMap.keys().next().value;
            this._dedupMap.delete(oldest);
        }
    }

    _sweepDedup() {
        const cutoff = Date.now() - DEDUP_WINDOW_MS;
        for (const [fp, ts] of this._dedupMap) {
            if (ts < cutoff) this._dedupMap.delete(fp);
        }
    }

    // ─── Stats / Admin ────────────────────────────────────────────────────────

    getStats() {
        return {
            ...this._stats,
            cycle_count: this._cycleCount,
            paused: this._paused,
            buffer_depth: this.buffer.size()
        };
    }

    getSources() {
        return this.sources.map(s => s.stats());
    }
}
