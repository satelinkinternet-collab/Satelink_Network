
/**
 * Phase 36 — Node Reputation Engine
 *
 * Scores every node on 5 dimensions, computes a composite,
 * assigns tiers, tracks history, handles decay + fraud penalties,
 * and integrates with incident/safe-mode systems.
 *
 * Composite = 0.30×uptime + 0.25×latency + 0.20×reliability
 *           + 0.15×revenue + 0.10×(100 - fraud_penalty)
 *
 * Tiers: platinum ≥85 | gold ≥70 | silver ≥50 | bronze <50
 */
export class ReputationEngine {
    constructor(db) {
        this.db = db;
    }

    // ── WEIGHTS ──────────────────────────────────────────────
    static WEIGHTS = { uptime: 0.30, latency: 0.25, reliability: 0.20, revenue: 0.15, fraud_inv: 0.10 };
    static TIERS = { platinum: 85, gold: 70, silver: 50 };
    static MULTIPLIERS = { platinum: 1.15, gold: 1.05, silver: 1.0, bronze: 0.85 };

    // ═════════════════════════════════════════════════════════
    // 36.1 — DAILY SCORING JOB
    // ═════════════════════════════════════════════════════════

    async computeAllScores() {
        const now = Date.now();
        const nodes = this._getAllNodes();
        const results = [];

        for (const node of nodes) {
            const scores = this._computeNodeScores(node.node_id || node.wallet, now);
            results.push(scores);
        }

        return { computed: results.length, timestamp: now };
    }

    _computeNodeScores(nodeId, now) {
        const dayAgo = now - 86400000;
        const weekAgo = now - 7 * 86400000;

        // 1. Uptime score (0-100): % of time online in last 7 days
        let uptimeScore = 50;
        try {
            const ut = this.db.prepare(
                "SELECT AVG(uptime_seconds) as avg_up FROM node_uptime WHERE node_wallet = ? AND epoch_id IN (SELECT epoch_id FROM node_uptime WHERE node_wallet = ? ORDER BY epoch_id DESC LIMIT 7)"
            ).get([nodeId, nodeId]);
            if (ut?.avg_up != null) {
                uptimeScore = Math.min(100, Math.max(0, (ut.avg_up / 86400) * 100));
            }
        } catch (e) { /* table may not exist */ }

        // 2. Latency score (0-100): inverse of avg latency (lower = better)
        let latencyScore = 50;
        try {
            const lat = this.db.prepare(
                "SELECT AVG(latency_ms) as avg_lat FROM ops_traces WHERE node_id = ? AND created_at > ?"
            ).get([nodeId, weekAgo]);
            if (lat?.avg_lat != null) {
                // 0ms = 100, 500ms+ = 0
                latencyScore = Math.min(100, Math.max(0, 100 - (lat.avg_lat / 5)));
            }
        } catch (e) { /* table may not exist */ }

        // 3. Reliability score (0-100): success rate of ops
        let reliabilityScore = 50;
        try {
            const total = this.db.prepare(
                "SELECT COUNT(*) as c FROM ops_traces WHERE node_id = ? AND created_at > ?"
            ).get([nodeId, weekAgo]);
            const fails = this.db.prepare(
                "SELECT COUNT(*) as c FROM ops_traces WHERE node_id = ? AND created_at > ? AND status = 'failed'"
            ).get([nodeId, weekAgo]);
            if (total?.c > 0) {
                reliabilityScore = Math.min(100, Math.max(0, ((total.c - (fails?.c || 0)) / total.c) * 100));
            }
        } catch (e) { /* table may not exist */ }

        // 4. Revenue consistency (0-100): based on daily revenue variance
        let revenueScore = 50;
        try {
            const rev = this.db.prepare(
                "SELECT COUNT(*) as ops, SUM(amount_usdt) as total FROM revenue_events_v2 WHERE node_id = ? AND created_at > ?"
            ).get([nodeId, weekAgo]);
            if (rev?.ops > 0) {
                // More ops = higher score, normalized to 100 at 50+ ops/week
                revenueScore = Math.min(100, Math.max(0, (rev.ops / 50) * 100));
            }
        } catch (e) { /* no revenue data */ }

        // 5. Fraud penalty (0-100): higher = worse
        let fraudPenalty = 0;
        try {
            const flags = this.db.prepare(
                "SELECT COUNT(*) as c FROM distributor_commissions WHERE fraud_flag = 1 AND distributor_wallet = ?"
            ).get([nodeId]);
            fraudPenalty = Math.min(100, (flags?.c || 0) * 20);
        } catch (e) { /* no fraud data */ }

        // Check quarantine
        try {
            const quarantined = this.db.prepare(
                "SELECT COUNT(*) as c FROM abuse_events WHERE node_id = ? AND action = 'quarantine' AND created_at > ?"
            ).get([nodeId, weekAgo]);
            if (quarantined?.c > 0) fraudPenalty = Math.min(100, fraudPenalty + 40);
        } catch (e) { /* no abuse table */ }

        const W = ReputationEngine.WEIGHTS;
        const composite = Math.round(
            (W.uptime * uptimeScore) +
            (W.latency * latencyScore) +
            (W.reliability * reliabilityScore) +
            (W.revenue * revenueScore) +
            (W.fraud_inv * (100 - fraudPenalty))
        );

        const tier = this._assignTier(composite);

        // Upsert into node_reputation
        this.db.prepare(`
            INSERT INTO node_reputation (node_id, uptime_score, latency_score, reliability_score, fraud_penalty_score, revenue_score, composite_score, tier, last_updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(node_id) DO UPDATE SET
                uptime_score = excluded.uptime_score,
                latency_score = excluded.latency_score,
                reliability_score = excluded.reliability_score,
                fraud_penalty_score = excluded.fraud_penalty_score,
                revenue_score = excluded.revenue_score,
                composite_score = excluded.composite_score,
                tier = excluded.tier,
                last_updated_at = excluded.last_updated_at
        `).run([nodeId, uptimeScore, latencyScore, reliabilityScore, fraudPenalty, revenueScore, composite, tier, now]);

        // Record history
        this.db.prepare(
            "INSERT INTO reputation_history (node_id, composite_score, tier, recorded_at) VALUES (?, ?, ?, ?)"
        ).run([nodeId, composite, tier, now]);

        return {
            node_id: nodeId, uptime_score: uptimeScore, latency_score: latencyScore,
            reliability_score: reliabilityScore, fraud_penalty_score: fraudPenalty,
            revenue_score: revenueScore, composite_score: composite, tier
        };
    }

    _assignTier(composite) {
        const T = ReputationEngine.TIERS;
        if (composite >= T.platinum) return 'platinum';
        if (composite >= T.gold) return 'gold';
        if (composite >= T.silver) return 'silver';
        return 'bronze';
    }

    _getAllNodes() {
        // Try multiple possible node tables
        try {
            const nodes = this.db.prepare("SELECT wallet as node_id FROM registered_nodes").all([]) || [];
            if (nodes.length > 0) return nodes;
        } catch (e) { /* fallback */ }
        try {
            return this.db.prepare("SELECT DISTINCT node_id FROM node_reputation").all([]) || [];
        } catch (e) { return []; }
    }

    // ═════════════════════════════════════════════════════════
    // 36.2 — QUALITY-WEIGHTED ROUTING
    // ═════════════════════════════════════════════════════════

    selectNodeForOp(availableNodeIds) {
        const enabled = this.db.prepare("SELECT value FROM system_config WHERE key = 'quality_routing_enabled'").get([]);
        if (enabled?.value !== 'true' || !availableNodeIds?.length) {
            // Fallback: random selection
            return availableNodeIds?.[Math.floor(Math.random() * availableNodeIds.length)] || null;
        }

        // Get scores for available nodes
        const placeholders = availableNodeIds.map(() => '?').join(',');
        const nodes = this.db.prepare(
            `SELECT node_id, composite_score, fraud_penalty_score, tier FROM node_reputation WHERE node_id IN (${placeholders})`
        ).all(availableNodeIds) || [];

        if (nodes.length === 0) {
            return availableNodeIds[Math.floor(Math.random() * availableNodeIds.length)];
        }

        // Filter out high-fraud nodes
        const eligible = nodes.filter(n => n.fraud_penalty_score < 60);
        if (eligible.length === 0) return nodes[0].node_id;

        // Weighted random by composite score
        const totalWeight = eligible.reduce((s, n) => s + Math.max(1, n.composite_score), 0);
        let rand = Math.random() * totalWeight;
        for (const n of eligible) {
            rand -= Math.max(1, n.composite_score);
            if (rand <= 0) return n.node_id;
        }
        return eligible[eligible.length - 1].node_id;
    }

    // ═════════════════════════════════════════════════════════
    // 36.3 — REWARD MULTIPLIER
    // ═════════════════════════════════════════════════════════

    getRewardMultiplier(nodeId) {
        const enabled = this.db.prepare("SELECT value FROM system_config WHERE key = 'reputation_multiplier_enabled'").get([]);
        if (enabled?.value !== 'true') return 1.0;

        const rep = this.db.prepare("SELECT tier FROM node_reputation WHERE node_id = ?").get([nodeId]);
        return ReputationEngine.MULTIPLIERS[rep?.tier || 'bronze'] || 1.0;
    }

    getReputationImpact() {
        const tiers = this.getTierDistribution();
        const M = ReputationEngine.MULTIPLIERS;

        // Get total daily rewards
        const dayAgo = Date.now() - 86400000;
        const dailyRewards = (this.db.prepare(
            "SELECT SUM(amount_usdt) as t FROM distributor_commissions WHERE created_at > ?", [dayAgo]
        ))?.t || 0;

        // Project impact per tier
        const impact = {};
        let totalProjected = 0;
        for (const [tier, count] of Object.entries(tiers)) {
            const avgPerNode = dailyRewards / Math.max(1, Object.values(tiers).reduce((a, b) => a + b, 0));
            const projected = avgPerNode * count * M[tier];
            impact[tier] = { count, multiplier: M[tier], projected_daily: Math.round(projected * 100) / 100 };
            totalProjected += projected;
        }

        return {
            current_daily_rewards: Math.round(dailyRewards * 100) / 100,
            projected_with_multipliers: Math.round(totalProjected * 100) / 100,
            delta: Math.round((totalProjected - dailyRewards) * 100) / 100,
            delta_pct: dailyRewards > 0 ? Math.round(((totalProjected - dailyRewards) / dailyRewards) * 10000) / 100 : 0,
            tiers: impact
        };
    }

    // ═════════════════════════════════════════════════════════
    // 36.4 — PUBLIC NODE PROFILE
    // ═════════════════════════════════════════════════════════

    async getPublicProfile(nodeId) {
        const rep = await this.db.get("SELECT * FROM node_reputation WHERE node_id = ?", [nodeId]);
        if (!rep) return null;

        // History for sparkline (last 30 entries)
        const history = await this.db.query(
            "SELECT composite_score, tier, recorded_at FROM reputation_history WHERE node_id = ? ORDER BY recorded_at DESC LIMIT 30",
            [nodeId]
        ) || [];

        // Total ops served
        let totalOps = 0;
        try {
            totalOps = (await this.db.get(
                "SELECT COUNT(*) as c FROM revenue_events_v2 WHERE node_id = ?", [nodeId]
            ))?.c || 0;
        } catch (e) { /* no revenue table */ }

        // Last active
        let lastActive = rep.last_updated_at;
        try {
            const la = await this.db.get(
                "SELECT MAX(created_at) as t FROM revenue_events_v2 WHERE node_id = ?", [nodeId]
            );
            if (la?.t) lastActive = la.t;
        } catch (e) { /* fallback */ }

        return {
            node_id: nodeId,
            uptime_pct: Math.round(rep.uptime_score * 10) / 10,
            avg_latency_score: Math.round(rep.latency_score * 10) / 10,
            tier: rep.tier,
            composite_score: rep.composite_score,
            total_ops: totalOps,
            last_active: lastActive,
            history: history.reverse()
        };
    }

    // ═════════════════════════════════════════════════════════
    // 36.5 — DECAY + FRAUD PENALTIES
    // ═════════════════════════════════════════════════════════

    async applyDecay(inactiveDaysThreshold = 7) {
        const now = Date.now();
        const threshold = now - (inactiveDaysThreshold * 86400000);
        const decayed = [];

        const stale = await this.db.query(
            "SELECT node_id, composite_score, tier FROM node_reputation WHERE last_updated_at < ?",
            [threshold]
        ) || [];

        for (const node of stale) {
            const newScore = Math.max(0, Math.round(node.composite_score * 0.95));
            const newTier = this._assignTier(newScore);
            await this.db.query(
                "UPDATE node_reputation SET composite_score = ?, tier = ?, last_updated_at = ? WHERE node_id = ?",
                [newScore, newTier, now, node.node_id]
            );
            await this.db.query(
                "INSERT INTO reputation_history (node_id, composite_score, tier, recorded_at) VALUES (?, ?, ?, ?)",
                [node.node_id, newScore, newTier, now]
            );
            decayed.push({ node_id: node.node_id, old_score: node.composite_score, new_score: newScore, old_tier: node.tier, new_tier: newTier });
        }

        return { decayed_count: decayed.length, nodes: decayed };
    }

    async applyFraudPenalty(nodeId, penaltyAmount = 30) {
        const now = Date.now();
        const rep = await this.db.get("SELECT * FROM node_reputation WHERE node_id = ?", [nodeId]);
        if (!rep) return { ok: false, reason: 'node not found' };

        const newFraud = Math.min(100, rep.fraud_penalty_score + penaltyAmount);
        const W = ReputationEngine.WEIGHTS;
        const newComposite = Math.round(
            (W.uptime * rep.uptime_score) + (W.latency * rep.latency_score) +
            (W.reliability * rep.reliability_score) + (W.revenue * rep.revenue_score) +
            (W.fraud_inv * (100 - newFraud))
        );
        const newTier = this._assignTier(newComposite);

        await this.db.query(
            "UPDATE node_reputation SET fraud_penalty_score = ?, composite_score = ?, tier = ?, last_updated_at = ? WHERE node_id = ?",
            [newFraud, newComposite, newTier, now, nodeId]
        );
        await this.db.query(
            "INSERT INTO reputation_history (node_id, composite_score, tier, recorded_at) VALUES (?, ?, ?, ?)",
            [nodeId, newComposite, newTier, now]
        );

        return { ok: true, node_id: nodeId, old_tier: rep.tier, new_tier: newTier, old_score: rep.composite_score, new_score: newComposite, fraud_penalty: newFraud };
    }

    // ═════════════════════════════════════════════════════════
    // 36.6 — MARKETPLACE / LEADERBOARD
    // ═════════════════════════════════════════════════════════

    async getLeaderboard(limit = 20) {
        return await this.db.query(
            "SELECT node_id, composite_score, tier, uptime_score, latency_score, reliability_score FROM node_reputation ORDER BY composite_score DESC LIMIT ?",
            [limit]
        ) || [];
    }

    async getRisingNodes(limit = 10) {
        const weekAgo = Date.now() - 7 * 86400000;
        try {
            return await this.db.query(`
                SELECT rh.node_id,
                       MAX(rh.composite_score) - MIN(rh.composite_score) as improvement,
                       nr.tier, nr.composite_score as current_score
                FROM reputation_history rh
                JOIN node_reputation nr ON nr.node_id = rh.node_id
                WHERE rh.recorded_at > ?
                GROUP BY rh.node_id
                HAVING improvement > 0
                ORDER BY improvement DESC LIMIT ?
            `, [weekAgo, limit]) || [];
        } catch (e) { return []; }
    }

    async getMostReliable(limit = 10) {
        return await this.db.query(
            "SELECT node_id, reliability_score, composite_score, tier FROM node_reputation ORDER BY reliability_score DESC LIMIT ?",
            [limit]
        ) || [];
    }

    async getTierDistribution() {
        const rows = await this.db.query(
            "SELECT tier, COUNT(*) as count FROM node_reputation GROUP BY tier"
        ) || [];
        const dist = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
        for (const r of rows) dist[r.tier] = r.count;
        return dist;
    }

    // ═════════════════════════════════════════════════════════
    // 36.7 — INCIDENT INTEGRATION
    // ═════════════════════════════════════════════════════════

    async checkReputationIncident() {
        const hourAgo = Date.now() - 3600000;
        const alerts = [];

        try {
            // Check for mass reputation drops
            const recentDrops = await this.db.query(`
                SELECT rh.node_id,
                       MIN(rh.composite_score) as low,
                       MAX(rh.composite_score) as high
                FROM reputation_history rh
                WHERE rh.recorded_at > ?
                GROUP BY rh.node_id
                HAVING (high - low) > 15
            `, [hourAgo]) || [];

            const totalNodes = (await this.db.get("SELECT COUNT(*) as c FROM node_reputation"))?.c || 1;
            const dropPct = (recentDrops.length / totalNodes) * 100;

            if (dropPct > 30) {
                alerts.push({
                    type: 'mass_reputation_drop',
                    severity: 'critical',
                    affected_pct: Math.round(dropPct),
                    affected_nodes: recentDrops.length
                });

                // Create incident
                try {
                    await this.db.query(`
                        INSERT INTO incident_bundles (id, kind, title, severity, status, created_at, summary)
                        VALUES (?, 'reputation_crisis', ?, 'critical', 'open', ?, ?)
                    `, [
                        `REP-CRISIS-${Date.now()}`,
                        `Mass reputation drop: ${recentDrops.length} nodes (${Math.round(dropPct)}%)`,
                        Date.now(),
                        `${recentDrops.length} of ${totalNodes} nodes experienced >15pt reputation drops in the last hour. Possible infrastructure issue.`
                    ]);
                } catch (e) { /* ignore duplicate */ }
            }

            // Check latency spike among gold/platinum
            const eliteLatencySpike = await this.db.query(`
                SELECT node_id, latency_score FROM node_reputation
                WHERE tier IN ('gold','platinum') AND latency_score < 30
            `) || [];

            if (eliteLatencySpike.length > 3) {
                alerts.push({
                    type: 'elite_latency_spike',
                    severity: 'warning',
                    affected_nodes: eliteLatencySpike.length
                });
            }
        } catch (e) { /* tables may not exist */ }

        return { total_alerts: alerts.length, alerts };
    }

    // ═════════════════════════════════════════════════════════
    // Helpers
    // ═════════════════════════════════════════════════════════

    async getAllReputations() {
        return await this.db.query(
            "SELECT * FROM node_reputation ORDER BY composite_score DESC"
        ) || [];
    }

    async getNodeReputation(nodeId) {
        return await this.db.get("SELECT * FROM node_reputation WHERE node_id = ?", [nodeId]);
    }
}
