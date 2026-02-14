import crypto from 'crypto';

export class AbuseFirewall {
    constructor(db, alertService = null) {
        this.db = db;
        this.alertService = alertService;
        // In-memory cache for fast lookups, synced with DB
        this.cache = new Map();

        // Thresholds (hardcoded for now as per spec)
        this.RULES = {
            ip_auth_fail_limit: 20, // Block IP if > 20 auth fails in 5m
            ip_req_limit: 1500,     // Throttle IP if > 1500 reqs in 5m
            wallet_rl_hit_limit: 200, // Throttle wallet if > 200 RL hits in 5m
            node_op_fail_rate: 0.6, // Throttle node if fail rate > 60% (min 50 ops)
        };
    }

    async init() {
        // Load active blocks from DB into cache
        const now = Date.now(); // ms
        const active = await this.db.query("SELECT * FROM enforcement_events WHERE expires_at > ?", [now]);
        for (const row of active) {
            this._cacheDecision(row.entity_type, row.entity_id, {
                decision: row.decision,
                reason: JSON.parse(row.reason_codes_json)[0],
                expiresAt: row.expires_at
            });
        }
        console.log(`[FIREWALL] Loaded ${active.length} active rules.`);

        // Cleanup interval
        setInterval(() => this._cleanup(), 60000);
    }

    _cacheDecision(type, id, data) {
        const key = `${type}:${id}`;
        this.cache.set(key, data);
    }

    _cleanup() {
        const now = Date.now();
        for (const [key, val] of this.cache.entries()) {
            if (val.expiresAt < now) this.cache.delete(key);
        }
    }

    // ─── 1. Metrics Recording ─────────────────────────────────────────

    async recordMetric({ key_type, key_value, metric, inc = 1, now = Date.now() }) {
        if (!key_value) return;

        // 5-minute window bucket (in seconds)
        const windowStart = Math.floor(now / 1000 / 300) * 300;

        try {
            await this.db.query(`
                INSERT INTO abuse_counters_5m (window_start, key_type, key_value, metric, count, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(window_start, key_type, key_value, metric) 
                DO UPDATE SET count = count + ?, updated_at = ?
            `, [windowStart, key_type, key_value, metric, inc, now, inc, now]);

            // Post-metric check: should we block?
            // This is "reactive" blocking.
            await this.evaluateRules({ key_type, key_value, windowStart, now });

        } catch (e) {
            console.error('[Firewall] Metric record error:', e.message);
        }
    }

    // ─── 2. Decision Engine ───────────────────────────────────────────

    async decide(ctx) {
        // ctx: { wallet, clientId, nodeId, ipHash, route, opType, now }
        const now = ctx.now || Date.now();

        // A. Fast Cache Check
        const keys = [
            ctx.wallet ? `wallet:${ctx.wallet}` : null,
            ctx.nodeId ? `node:${ctx.nodeId}` : null,
            ctx.clientId ? `client:${ctx.clientId}` : null,
            ctx.ipHash ? `ip_hash:${ctx.ipHash}` : null,
            ctx.route ? `route:${ctx.route}` : null
        ].filter(Boolean);

        for (const key of keys) {
            const cached = this.cache.get(key);
            if (cached && cached.expiresAt > now) {
                return {
                    decision: cached.decision,
                    reason_codes: [cached.reason],
                    ttl_seconds: Math.ceil((cached.expiresAt - now) / 1000)
                };
            }
        }

        // If no active enforcement, allow.
        // We rely on 'recordMetric' + 'evaluateRules' to create enforcements asynchronously/reactively.
        // Doing full rule eval on every request is too slow for SQLite.
        return { decision: 'allow', reason_codes: [], ttl_seconds: 0 };
    }

    // ─── 3. Rule Evaluation (Reactive) ────────────────────────────────

    async evaluateRules({ key_type, key_value, windowStart, now }) {
        // Only check rules relevant to the updated metric key

        // Rule 1: IP Auth Failures
        if (key_type === 'ip_hash') {
            const stats = await this.getCounter(windowStart, 'ip_hash', key_value, 'auth_fail');
            if (stats >= this.RULES.ip_auth_fail_limit) {
                await this.enforce({
                    entity_type: 'ip_hash', entity_id: key_value,
                    decision: 'block', reason: 'excessive_auth_failures',
                    ttl: 1800 // 30m
                });
                return;
            }

            const reqs = await this.getCounter(windowStart, 'ip_hash', key_value, 'req');
            if (reqs >= this.RULES.ip_req_limit) {
                await this.enforce({
                    entity_type: 'ip_hash', entity_id: key_value,
                    decision: 'throttle', reason: 'high_request_rate',
                    ttl: 900 // 15m
                });
            }
        }

        // Rule 2: Wallet/Client RL Hits
        if (key_type === 'wallet' || key_type === 'client_id') {
            const hits = await this.getCounter(windowStart, key_type, key_value, 'rl_hit');
            if (hits >= this.RULES.wallet_rl_hit_limit) {
                await this.enforce({
                    entity_type: key_type, entity_id: key_value,
                    decision: 'throttle', reason: 'excessive_rate_limits',
                    ttl: 900 // 15m
                });
            }
        }

        // Rule 3: Node Op Failure Rate
        if (key_type === 'node_id') {
            const fails = await this.getCounter(windowStart, 'node_id', key_value, 'op_fail');
            const total = await this.getCounter(windowStart, 'node_id', key_value, 'op_total');

            if (total >= 50 && (fails / total) >= this.RULES.node_op_fail_rate) {
                await this.enforce({
                    entity_type: 'node_id', entity_id: key_value,
                    decision: 'throttle', reason: 'high_op_failure_rate',
                    ttl: 1800 // 30m
                });
            }
        }
    }

    async getCounter(windowStart, type, value, metric) {
        const row = await this.db.get(
            `SELECT count FROM abuse_counters_5m WHERE window_start=? AND key_type=? AND key_value=? AND metric=?`,
            [windowStart, type, value, metric]
        );
        return row ? row.count : 0;
    }

    async enforce({ entity_type, entity_id, decision, reason, ttl, createdBy = 'system' }) {
        // Idempotency check (cache)
        const key = `${entity_type}:${entity_id}`;
        const cached = this.cache.get(key);
        if (cached && cached.decision === decision && cached.expiresAt > Date.now()) return;

        const now = Date.now();
        const expiresAt = now + (ttl * 1000);

        // Persist
        await this.db.query(`
            INSERT INTO enforcement_events (entity_type, entity_id, decision, reason_codes_json, ttl_seconds, created_at, expires_at, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [entity_type, entity_id, decision, JSON.stringify([reason]), ttl, now, expiresAt, createdBy]);

        // Cache
        this._cacheDecision(entity_type, entity_id, { decision, reason, expiresAt });

        console.log(`[FIREWALL] Enforced ${decision} on ${entity_type}:${entity_id} for ${reason}`);

        // Alert if block
        if (decision === 'block' && this.alertService) {
            await this.alertService.createAlert({
                type: 'abuse_block',
                severity: 'medium',
                title: `Blocked ${entity_type} for ${reason}`,
                source_ip: entity_type === 'ip_hash' ? entity_id : 'n/a'
            });
        }
    }

    // For admin to clear
    async clearDecision(type, id) {
        await this.db.query(`UPDATE enforcement_events SET expires_at = ? WHERE entity_type = ? AND entity_id = ?`, [Date.now(), type, id]);
        this.cache.delete(`${type}:${id}`);
    }
}
