import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * Incident Builder — Correlation + Redaction + Export
 *
 * Builds fully correlated, redacted incident bundles from DB data
 * within a time window. Used by self-test runner (auto), fix-request
 * endpoint, and /export endpoint.
 */

// ─── Redaction ──────────────────────────────────────────────

const SENSITIVE_PATTERN = /token|secret|key|authorization|password|jwt|api_key|private/i;
const LONG_HEX_PATTERN = /\b(0x)?[0-9a-fA-F]{32,}\b/g;
const JWT_PATTERN = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g;

function deepRedact(obj) {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') {
        let s = obj.replace(JWT_PATTERN, 'JWT_REDACTED');
        s = s.replace(LONG_HEX_PATTERN, (m) => {
            if (m.length > 32) return m.substring(0, 8) + '…' + m.substring(m.length - 4);
            return m;
        });
        return s;
    }
    if (Array.isArray(obj)) return obj.map(deepRedact);
    if (typeof obj === 'object') {
        const result = {};
        for (const [k, v] of Object.entries(obj)) {
            if (SENSITIVE_PATTERN.test(k)) {
                result[k] = '***REDACTED***';
            } else {
                result[k] = deepRedact(v);
            }
        }
        return result;
    }
    return obj;
}

function safeParseJson(str) {
    if (!str) return null;
    try { return JSON.parse(str); } catch { return str; }
}

// ─── Main Builder ───────────────────────────────────────────

export class IncidentBuilder {
    constructor(db) {
        this.db = db;
    }

    /**
     * Build a correlated incident bundle.
     *
     * @param {Object} opts
     * @param {number} opts.window_start - epoch ms start
     * @param {number} opts.window_end   - epoch ms end
     * @param {string} [opts.seed_trace_id]   - focal trace_id
     * @param {string} [opts.seed_stack_hash] - focal error group
     * @param {number} [opts.include_limits]  - max rows per section (default 50)
     * @returns {Object} Fully redacted bundle
     */
    async buildIncidentBundle(opts = {}) {
        const {
            window_start = Date.now() - 30 * 60_000, // default: last 30min
            window_end = Date.now(),
            seed_trace_id = null,
            seed_stack_hash = null,
            include_limits = 50
        } = opts;

        const limit = Math.min(include_limits, 200);

        const [
            systemFlags,
            configLimits,
            topErrors,
            slowQueries,
            traces,
            auditLog,
            alerts
        ] = await Promise.all([
            this._queryRows('SELECT * FROM system_flags'),
            this._queryRows('SELECT * FROM config_limits'),
            this._queryRows(
                `SELECT stack_hash, message, route, method, status_code, count, 
                        stack_preview, first_seen_at, last_seen_at, trace_id
                 FROM error_events 
                 WHERE last_seen_at BETWEEN ? AND ?
                 ORDER BY count DESC LIMIT ?`,
                [window_start, window_end, limit]
            ),
            this._queryRows(
                `SELECT query_hash, avg_ms, p95_ms, count, last_seen_at, sample_sql, source
                 FROM slow_queries 
                 WHERE last_seen_at BETWEEN ? AND ?
                 ORDER BY p95_ms DESC LIMIT ?`,
                [window_start, window_end, limit]
            ),
            this._getTraces(window_start, window_end, seed_trace_id, limit),
            this._queryRows(
                `SELECT actor_wallet, action_type, target_type, target_id, created_at
                 FROM admin_audit_log
                 WHERE created_at BETWEEN ? AND ?
                 ORDER BY created_at DESC LIMIT ?`,
                [window_start, window_end, limit]
            ),
            this._queryRows(
                `SELECT id, severity, category, title, status, created_at
                 FROM security_alerts
                 WHERE created_at BETWEEN ? AND ?
                 ORDER BY created_at DESC LIMIT ?`,
                [window_start, window_end, limit]
            ),
        ]);

        // Correlation keys
        const traceIds = [...new Set(traces.map(t => t.trace_id).filter(Boolean))];
        const stackHashes = [...new Set(topErrors.map(e => e.stack_hash).filter(Boolean))];
        const queryHashes = [...new Set(slowQueries.map(q => q.query_hash).filter(Boolean))];

        // If seed provided, highlight it
        if (seed_stack_hash && !stackHashes.includes(seed_stack_hash)) {
            stackHashes.unshift(seed_stack_hash);
        }
        if (seed_trace_id && !traceIds.includes(seed_trace_id)) {
            traceIds.unshift(seed_trace_id);
        }

        // Environment info
        const env = {
            node_version: process.version,
            uptime_seconds: Math.round(process.uptime()),
            platform: process.platform,
            build_hash: process.env.BUILD_HASH || process.env.GIT_SHA || 'dev',
            db_size_bytes: this._getDbSize(),
            bundle_generated_at: Date.now(),
            window: { start: window_start, end: window_end }
        };

        const bundle = {
            version: '1.0',
            generated_at: new Date().toISOString(),
            environment: env,
            system_flags: this._flagsToObj(systemFlags),
            config_limits: this._flagsToObj(configLimits),
            errors: { count: topErrors.length, items: topErrors },
            slow_queries: { count: slowQueries.length, items: slowQueries },
            traces: { count: traces.length, items: traces },
            audit_log: { count: auditLog.length, items: auditLog },
            security_alerts: { count: alerts.length, items: alerts },
            correlation: {
                trace_ids: traceIds.slice(0, 50),
                stack_hashes: stackHashes.slice(0, 20),
                query_hashes: queryHashes.slice(0, 20),
                seed_trace_id,
                seed_stack_hash
            }
        };

        return deepRedact(bundle);
    }

    // ─── Spike Detection ────────────────────────────────────

    /**
     * Check for error and latency spikes in the last 5 minutes.
     * Returns array of spikes found (may be empty).
     */
    async checkSpikes() {
        const fiveMinAgo = Date.now() - 5 * 60_000;
        const spikes = [];

        // Error spike: >10 new error_events in 5min
        try {
            const errorCount = await this.db.get(
                'SELECT COUNT(*) as cnt FROM error_events WHERE last_seen_at > ?',
                [fiveMinAgo]
            );
            if (errorCount && errorCount.cnt > 10) {
                spikes.push({
                    type: 'error_spike',
                    severity: errorCount.cnt > 50 ? 'critical' : 'high',
                    title: `Error spike: ${errorCount.cnt} errors in last 5min`,
                    value: errorCount.cnt
                });
            }
        } catch (_) { }

        // p95 latency spike: >2000ms in last 5min
        try {
            const rows = await this.db.query(
                `SELECT duration_ms FROM request_traces 
                 WHERE created_at > ? ORDER BY duration_ms DESC LIMIT 100`,
                [fiveMinAgo]
            );
            if (rows.length >= 5) {
                const idx = Math.floor(rows.length * 0.05);
                const p95 = rows[idx]?.duration_ms || 0;
                if (p95 > 2000) {
                    spikes.push({
                        type: 'latency_spike',
                        severity: 'high',
                        title: `p95 latency spike: ${p95}ms in last 5min`,
                        value: p95
                    });
                }
            }
        } catch (_) { }

        return spikes;
    }

    /**
     * Create incidents from detected spikes.
     * Returns number of incidents created.
     */
    async createSpikeIncidents() {
        const spikes = await this.checkSpikes();
        let created = 0;

        for (const spike of spikes) {
            // Dedup: only create if no open incident of same type exists in last 30min
            try {
                const existing = await this.db.get(
                    `SELECT id FROM incident_bundles 
                     WHERE title LIKE ? AND status = 'open' AND created_at > ?`,
                    [`%${spike.type}%`, Date.now() - 30 * 60_000]
                );
                if (existing) continue;

                const bundle = await this.buildIncidentBundle({
                    window_start: Date.now() - 10 * 60_000,
                    window_end: Date.now(),
                    include_limits: 20
                });

                await this.db.query(
                    `INSERT INTO incident_bundles (severity, title, source_kind, context_json, status, created_at)
                     VALUES (?, ?, 'auto_spike', ?, 'open', ?)`,
                    [spike.severity, spike.title, JSON.stringify(bundle), Date.now()]
                );

                // Also create security alert
                await this.db.query(
                    `INSERT INTO security_alerts (severity, category, entity_type, entity_id, title, evidence_json, status, created_at)
                     VALUES (?, 'infra', 'system', ?, ?, ?, 'open', ?)`,
                    [spike.severity, `spike:${spike.type}`, spike.title,
                    JSON.stringify({ type: spike.type, value: spike.value }), Date.now()]
                );

                created++;
            } catch (e) {
                console.error('[IncidentBuilder] Spike incident creation failed:', e.message);
            }
        }

        return created;
    }

    // ─── Helpers ────────────────────────────────────────────

    async _queryRows(sql, params = []) {
        try {
            return await this.db.query(sql, params);
        } catch (e) {
            console.error('[IncidentBuilder] Query error:', e.message);
            return [];
        }
    }

    async _getTraces(start, end, seedTraceId, limit) {
        if (seedTraceId) {
            // Get the seed trace + surrounding traces
            const seed = await this._queryRows(
                'SELECT * FROM request_traces WHERE trace_id = ? LIMIT 1',
                [seedTraceId]
            );
            const around = await this._queryRows(
                `SELECT trace_id, route, method, status_code, duration_ms, created_at
                 FROM request_traces
                 WHERE created_at BETWEEN ? AND ?
                 ORDER BY created_at DESC LIMIT ?`,
                [start, end, limit]
            );
            return [...seed, ...around.filter(t => t.trace_id !== seedTraceId)].slice(0, limit);
        }

        return this._queryRows(
            `SELECT trace_id, route, method, status_code, duration_ms, created_at
             FROM request_traces
             WHERE created_at BETWEEN ? AND ?
             ORDER BY created_at DESC LIMIT ?`,
            [start, end, limit]
        );
    }

    _flagsToObj(rows) {
        const obj = {};
        for (const r of rows) obj[r.key] = r.value;
        return obj;
    }

    _getDbSize() {
        try {
            const dbPath = process.env.SQLITE_PATH || 'satelink.db';
            const stats = fs.statSync(path.resolve(dbPath));
            return stats.size;
        } catch { return null; }
    }
}
