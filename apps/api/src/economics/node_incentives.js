/**
 * Node Incentive Engine (Module 3)
 *
 * Calculates and applies earnings multipliers based on:
 *   - first_100_nodes_bonus   : 1.25x for nodes 1–100 in the network
 *   - high_uptime_bonus       : +0.10x when reputation ≥ 90
 *   - high_performance_bonus  : +0.05x when jobs_completed ≥ 100 today
 *
 * Multipliers are additive (base = 1.0):
 *   effective_multiplier = base + uptime_bonus + performance_bonus
 *   BUT first_100 replaces base with 1.25 (not additive with itself).
 *
 * Usage:
 *   const engine = new NodeIncentiveEngine(db, registry, leaderboard);
 *   const { multiplier, bonuses } = engine.evaluate('node-alpha');
 *   const adjusted_reward = raw_reward * multiplier;
 */

export class NodeIncentiveEngine {
    // ─── Multiplier constants ─────────────────────────────────────────────────
    static BASE_MULTIPLIER = 1.00;
    static FIRST_100_MULTIPLIER = 1.25;   // replaces base for early nodes
    static HIGH_UPTIME_BONUS = 0.10;   // reputation ≥ 90
    static HIGH_PERFORMANCE_BONUS = 0.05;   // jobs_completed ≥ 100 (all-time)

    // ─── Thresholds ───────────────────────────────────────────────────────────
    static FIRST_N_NODES = 100;    // eligible node count
    static UPTIME_THRESHOLD = 90;     // reputation score
    static PERFORMANCE_THRESHOLD = 100;    // jobs_completed (all-time)

    /**
     * @param {Object} db
     * @param {import('../nodes/node_registry.js').NodeRegistry}      registry
     * @param {import('./node_leaderboard.js').NodeLeaderboard}        leaderboard
     */
    constructor(db, registry, leaderboard) {
        this.db = db;
        this.registry = registry;
        this.leaderboard = leaderboard;
    }

    /**
     * Evaluate all applicable incentives for a node.
     *
     * @param {string} node_id
     * @returns {{ multiplier: number, bonuses: string[], breakdown: Object }}
     */
    evaluate(node_id) {
        const node = this.registry?.get(node_id);
        const stats = this._getStats(node_id);

        const bonuses = [];
        let multiplier = NodeIncentiveEngine.BASE_MULTIPLIER;

        // ── 1. First-100-nodes bonus ──────────────────────────────────────────
        if (this._isEarlyNode(node_id)) {
            multiplier = NodeIncentiveEngine.FIRST_100_MULTIPLIER;
            bonuses.push('first_100_nodes_bonus');
        }

        // ── 2. High-uptime bonus (reputation ≥ threshold) ────────────────────
        const reputation = node?.reputation ?? 0;
        if (reputation >= NodeIncentiveEngine.UPTIME_THRESHOLD) {
            multiplier += NodeIncentiveEngine.HIGH_UPTIME_BONUS;
            bonuses.push('high_uptime_bonus');
        }

        // ── 3. High-performance bonus (jobs_completed ≥ threshold) ───────────
        const jobsDone = stats?.jobs_completed ?? 0;
        if (jobsDone >= NodeIncentiveEngine.PERFORMANCE_THRESHOLD) {
            multiplier += NodeIncentiveEngine.HIGH_PERFORMANCE_BONUS;
            bonuses.push('high_performance_bonus');
        }

        const breakdown = {
            base: NodeIncentiveEngine.BASE_MULTIPLIER,
            first_100: bonuses.includes('first_100_nodes_bonus') ? NodeIncentiveEngine.FIRST_100_MULTIPLIER : null,
            uptime_bonus: bonuses.includes('high_uptime_bonus') ? NodeIncentiveEngine.HIGH_UPTIME_BONUS : 0,
            performance_bonus: bonuses.includes('high_performance_bonus') ? NodeIncentiveEngine.HIGH_PERFORMANCE_BONUS : 0,
            reputation,
            jobs_completed: jobsDone
        };

        return {
            node_id,
            multiplier: Math.round(multiplier * 1000) / 1000,
            bonuses,
            breakdown
        };
    }

    /**
     * Apply multiplier to a raw reward and return both values.
     *
     * @param {string} node_id
     * @param {number} raw_reward
     * @returns {{ raw_reward, adjusted_reward, multiplier, bonuses }}
     */
    applyIncentive(node_id, raw_reward) {
        const { multiplier, bonuses, breakdown } = this.evaluate(node_id);
        const adjusted_reward = Math.round(raw_reward * multiplier * 1_000_000) / 1_000_000;
        return { node_id, raw_reward, adjusted_reward, multiplier, bonuses, breakdown };
    }

    // ─── Private ──────────────────────────────────────────────────────────────

    /**
     * A node qualifies as an "early node" if its position in the registry
     * (by created_at ascending) is ≤ FIRST_N_NODES.
     */
    _isEarlyNode(node_id) {
        try {
            const row = this.db.prepare(`
                SELECT COUNT(*) AS pos
                FROM node_registry
                WHERE created_at <= (SELECT created_at FROM node_registry WHERE node_id = ?)
            `).get(node_id);
            return (row?.pos ?? Infinity) <= NodeIncentiveEngine.FIRST_N_NODES;
        } catch (_) {
            return false;
        }
    }

    _getStats(node_id) {
        if (!this.leaderboard) return null;
        try {
            const rows = this.leaderboard.getLeaderboard(1000);
            return rows.find(r => r.node_id === node_id) || null;
        } catch (_) {
            return null;
        }
    }
}
