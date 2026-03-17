/**
 * Demand Flywheel Engine
 *
 * Subscribes to `workload.completed` events emitted after execution_router
 * finishes a job.  For every successful completion it applies four strategies
 * to generate follow-up workloads and enqueues them back into the demand_buffer.
 *
 * Protected modules NOT modified by this file:
 *   demand_buffer, execution_router, abuse_firewall,
 *   reputation_engine, economic_ledger, compatibility_gateway,
 *   genesis_workload_engine
 *
 * Loop guard: workloads tagged source:"demand_flywheel" are never re-processed.
 */

import { EventEmitter } from 'events';
import { flywheelConfig } from '../core/config/demand_flywheel_config.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_OP_TYPES = ['rpc_call', 'ai_inference', 'automation_job', 'webhook_delivery', 'data_processing'];

const VERIFICATION_OPERATIONS = ['api_health_check', 'dataset_validation', 'signature_verification'];

const DATA_DEP_OPERATIONS = [
    { operation: 'fetch_liquidity_pool', target: 'uniswap_v3' },
    { operation: 'fetch_transaction_statistics', target: 'ethereum_stats' },
    { operation: 'fetch_token_holders', target: 'token_registry' },
];

// ─── DemandFlywheelEngine ─────────────────────────────────────────────────────

export class DemandFlywheelEngine extends EventEmitter {
    /**
     * @param {import('../demand-engine/demand_buffer.js').DemandBuffer} demandBuffer
     * @param {import('./abuse_firewall.js').AbuseFirewall} abuseFirewall
     * @param {object} [opts]
     */
    constructor(demandBuffer, abuseFirewall, opts = {}) {
        super();

        if (!demandBuffer) throw new Error('[Flywheel] demandBuffer is required');
        if (!abuseFirewall) throw new Error('[Flywheel] abuseFirewall is required');

        this._buffer = demandBuffer;
        this._firewall = abuseFirewall;
        this._config = { ...flywheelConfig, ...opts };

        // ── State ─────────────────────────────────────────────────────────────
        this._paused = false;
        this._completionCount = 0;  // total workload.completed events seen

        // ── Rate limiter (token bucket — per minute) ──────────────────────────
        this._rateBucket = { count: 0, windowStart: Date.now() };

        // ── Client prediction store ───────────────────────────────────────────
        // clientId → Map<op_type, { count, last_seen_ms }>
        this._clientHistory = new Map();

        // ── Stats ─────────────────────────────────────────────────────────────
        this._stats = {
            jobs_generated: 0,
            jobs_enqueued: 0,
            jobs_blocked_by_firewall: 0,
            jobs_rate_limited: 0,
            jobs_loop_guarded: 0,       // dropped because source was already flywheel
            client_prediction_hits: 0,
            workload_types_seen: {},    // op_type → count
        };

        // ── Recent jobs ring buffer ───────────────────────────────────────────
        this._recentJobs = [];

        // ── Bind event handler ────────────────────────────────────────────────
        this._onCompleted = this._onCompleted.bind(this);
    }

    // ─── Lifecycle ────────────────────────────────────────────────────────────

    /**
     * Start listening for workload.completed events.
     * Call this after the engine is wired into the event bus.
     */
    start() {
        if (!this._config.enabled) {
            console.log('[Flywheel] Disabled by config — not starting.');
            return;
        }
        this.on('workload.completed', this._onCompleted);
        console.log('[Flywheel] Started — listening for workload.completed events.');
    }

    stop() {
        this.off('workload.completed', this._onCompleted);
        console.log('[Flywheel] Stopped.');
    }

    pause() { this._paused = true; console.log('[Flywheel] Paused.'); }
    resume() { this._paused = false; console.log('[Flywheel] Resumed.'); }
    get isPaused() { return this._paused; }

    // ─── Core event handler ───────────────────────────────────────────────────

    /**
     * Called for every `workload.completed` event.
     *
     * Expected event payload:
     * {
     *   id:           string   — workload ID
     *   op_type:      string   — one of VALID_OP_TYPES
     *   payload:      object   — original workload payload
     *   client_id:    string   — submitting client identifier
     *   latency_ms:   number   — execution latency
     *   success:      boolean  — whether the job succeeded
     *   source:       string   — originating system (e.g. 'genesis', 'rpc', 'demand_flywheel')
     * }
     */
    async _onCompleted(workload) {
        if (this._paused) return;

        // ── 1. Basic guard: only process successful jobs ───────────────────────
        if (!workload || !workload.success) return;

        // ── 2. Loop guard: never re-process flywheel output ───────────────────
        if (workload.source === this._config.flywheel_source_tag) {
            this._stats.jobs_loop_guarded++;
            return;
        }

        this._completionCount++;

        // Track op_type frequency for stats
        const opType = workload.op_type || 'unknown';
        this._stats.workload_types_seen[opType] = (this._stats.workload_types_seen[opType] || 0) + 1;

        // ── 3. Abuse firewall check ───────────────────────────────────────────
        let firewallDecision;
        try {
            firewallDecision = await this._firewall.decide({
                clientId: workload.client_id,
                wallet: workload.wallet || null,
                now: Date.now(),
            });
        } catch (_) {
            firewallDecision = { decision: 'allow' };
        }

        if (firewallDecision.decision !== 'allow') {
            this._stats.jobs_blocked_by_firewall++;
            return;
        }

        // ── 4. Update client prediction history ───────────────────────────────
        this._trackClientHistory(workload);

        // ── 5. Generate follow-up candidates from all active strategies ───────
        const candidates = [];

        if (this._config.strategies.chain_expansion) {
            candidates.push(...this._chainExpansion(workload));
        }
        if (this._config.strategies.data_dependency) {
            candidates.push(...this._dataDepExpansion(workload));
        }
        if (this._config.strategies.verification_jobs) {
            candidates.push(...this._verificationJobs(workload));
        }
        if (this._config.strategies.client_prediction) {
            candidates.push(...this._clientPrediction(workload));
        }

        if (candidates.length === 0) return;

        // ── 6. Enforce max_followups_per_workload cap ─────────────────────────
        const capped = candidates.slice(0, this._config.max_followups_per_workload);

        // ── 7. Rate limit + enqueue each candidate ────────────────────────────
        for (const candidate of capped) {
            if (!this._acquireRateToken()) {
                this._stats.jobs_rate_limited++;
                break;  // stop for this cycle; next completions can still proceed
            }

            const normalised = this._normalise(candidate, workload.id);
            const result = this._buffer.enqueue(normalised, this._config.demand_source_key);

            this._stats.jobs_generated++;

            if (result.accepted) {
                this._stats.jobs_enqueued++;
                this._pushRecent(normalised, workload.id);
            }
        }
    }

    // ─── Strategy 1: Chain Expansion ─────────────────────────────────────────

    /**
     * If workload processed a block, generate tasks for the next 2 blocks.
     */
    _chainExpansion(workload) {
        const { op_type, payload } = workload;
        if (op_type !== 'data_processing') return [];
        const blockNum = payload?.block_number;
        if (typeof blockNum !== 'number') return [];

        return [
            {
                op_type: 'data_processing',
                target: 'blockchain_indexer',
                operation: 'index_block',
                data: { block_number: blockNum + 1, chain: payload.chain || 'ethereum' },
            },
            {
                op_type: 'data_processing',
                target: 'blockchain_indexer',
                operation: 'index_block',
                data: { block_number: blockNum + 2, chain: payload.chain || 'ethereum' },
            },
        ];
    }

    // ─── Strategy 2: Data Dependency Expansion ────────────────────────────────

    /**
     * If workload involved a token address, generate related entity fetch tasks.
     */
    _dataDepExpansion(workload) {
        const { payload } = workload;
        const tokenAddress = payload?.token_address || payload?.address;
        if (!tokenAddress) return [];

        return DATA_DEP_OPERATIONS.map(op => ({
            op_type: 'data_processing',
            target: op.target,
            operation: op.operation,
            data: { token_address: tokenAddress },
        }));
    }

    // ─── Strategy 3: Verification Jobs ───────────────────────────────────────

    /**
     * Every N completions, schedule a verification task.
     */
    _verificationJobs(workload) {
        const cadence = this._config.verification_cadence;
        if (this._completionCount % cadence !== 0) return [];

        // Pick operation deterministically by count to spread variety
        const idx = Math.floor(this._completionCount / cadence) % VERIFICATION_OPERATIONS.length;
        const operation = VERIFICATION_OPERATIONS[idx];

        return [{
            op_type: 'data_processing',
            target: workload.target || 'satelink_network',
            operation,
            data: {
                triggered_by: workload.id,
                check_target: workload.target || 'satelink_network',
            },
        }];
    }

    // ─── Strategy 4: Client Demand Prediction ────────────────────────────────

    /**
     * Track per-client task frequency.  When a client reaches the prediction
     * threshold, schedule one more instance of their most-repeated task.
     */
    _clientPrediction(workload) {
        const clientId = workload.client_id;
        if (!clientId) return [];

        const history = this._clientHistory.get(clientId);
        if (!history) return [];

        // Find the most-repeated op_type for this client
        let topOp = null, topCount = 0;
        for (const [op, info] of history.entries()) {
            if (info.count > topCount) { topCount = info.count; topOp = op; }
        }

        if (!topOp || topCount < this._config.prediction_threshold) return [];

        // Only fire prediction once per N hits (every threshold multiple)
        const info = history.get(topOp);
        if (info.count % this._config.prediction_threshold !== 0) return [];

        this._stats.client_prediction_hits++;

        return [{
            op_type: topOp,
            target: workload.target || 'predicted',
            operation: 'predicted_repeat',
            data: {
                client_id: clientId,
                predicted_op_type: topOp,
                historical_count: topCount,
            },
        }];
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /** Track client workload history, pruning entries older than prediction_window. */
    _trackClientHistory(workload) {
        const clientId = workload.client_id;
        if (!clientId) return;

        const windowMs = this._config.prediction_window_hours * 3600 * 1000;
        const now = Date.now();

        if (!this._clientHistory.has(clientId)) {
            this._clientHistory.set(clientId, new Map());
        }
        const history = this._clientHistory.get(clientId);

        // Prune stale entries
        for (const [op, info] of history.entries()) {
            if (now - info.last_seen_ms > windowMs) history.delete(op);
        }

        const opType = workload.op_type;
        if (!history.has(opType)) {
            history.set(opType, { count: 0, last_seen_ms: now });
        }
        const entry = history.get(opType);
        entry.count++;
        entry.last_seen_ms = now;
    }

    /**
     * Convert a strategy-produced candidate into the normalised workload format
     * required by DemandBuffer.
     *
     * Normalised format:
     * {
     *   op_type:  string,
     *   target:   string,
     *   payload:  { source, operation, parent_workload_id, ...data },
     *   reward:   0          (low-priority internal workloads carry no reward)
     * }
     */
    _normalise(candidate, parentId) {
        return {
            op_type: VALID_OP_TYPES.includes(candidate.op_type) ? candidate.op_type : 'data_processing',
            target: candidate.target || 'satelink_internal',
            payload: {
                source: this._config.flywheel_source_tag,
                operation: candidate.operation || 'generated',
                parent_workload_id: parentId,
                priority: 'low',
                ...candidate.data,
            },
            reward: 0,
        };
    }

    /** Rate-limit token bucket — allows max_jobs_per_minute per sliding window. */
    _acquireRateToken() {
        const now = Date.now();
        if (now - this._rateBucket.windowStart >= 60_000) {
            // Reset bucket for new minute
            this._rateBucket = { count: 0, windowStart: now };
        }
        if (this._rateBucket.count >= this._config.max_jobs_per_minute) {
            return false;
        }
        this._rateBucket.count++;
        return true;
    }

    /** Push a summary into the recent-jobs ring buffer. */
    _pushRecent(normalised, parentId) {
        this._recentJobs.unshift({
            op_type: normalised.op_type,
            target: normalised.target,
            operation: normalised.payload.operation,
            parent_workload_id: parentId,
            enqueued_at: Date.now(),
        });
        if (this._recentJobs.length > this._config.recent_jobs_limit) {
            this._recentJobs.length = this._config.recent_jobs_limit;
        }
    }

    // ─── Stats / Admin ────────────────────────────────────────────────────────

    getStats() {
        // Build sorted top_workload_types list
        const top_workload_types = Object.entries(this._stats.workload_types_seen)
            .sort((a, b) => b[1] - a[1])
            .map(([op_type, count]) => ({ op_type, count }));

        return {
            enabled: this._config.enabled,
            paused: this._paused,
            jobs_generated: this._stats.jobs_generated,
            jobs_enqueued: this._stats.jobs_enqueued,
            jobs_blocked_by_firewall: this._stats.jobs_blocked_by_firewall,
            jobs_rate_limited: this._stats.jobs_rate_limited,
            jobs_loop_guarded: this._stats.jobs_loop_guarded,
            client_prediction_hits: this._stats.client_prediction_hits,
            top_workload_types,
            completion_events_seen: this._completionCount,
            buffer_depth: this._buffer.size(),
            rate_bucket: {
                count: this._rateBucket.count,
                window_start: this._rateBucket.windowStart,
                limit: this._config.max_jobs_per_minute,
            },
        };
    }

    getRecentJobs() {
        return [...this._recentJobs];
    }
}
