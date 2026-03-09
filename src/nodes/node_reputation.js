/**
 * Node Reputation Engine
 *
 * Calculates a composite reputation score (0–100) based on:
 *   - uptime percentage            (weight: 40%)
 *   - job success rate             (weight: 40%)
 *   - normalised latency score     (weight: 20%)
 *
 * Scores are written back to node_registry so the scheduler and router
 * can use a single source of truth.
 */

export class NodeReputation {
    /** Score weights — must sum to 1 */
    static WEIGHTS = {
        uptime: 0.4,
        job_success_rate: 0.4,
        latency: 0.2
    };

    /** Reference latency in ms — nodes at or below this score 100 on the latency axis */
    static IDEAL_LATENCY_MS = 50;

    /** Worst-case latency ceiling in ms — nodes at or above this score 0 */
    static WORST_LATENCY_MS = 2000;

    constructor(registry) {
        this.registry = registry;
    }

    /**
     * Calculate reputation for a node based on its performance stats.
     *
     * @param {string} node_id
     * @param {Object} stats
     * @param {number} stats.uptime_pct        0–100   (percentage uptime over evaluation window)
     * @param {number} stats.jobs_total        total jobs accepted
     * @param {number} stats.jobs_succeeded    subset of accepted jobs that succeeded
     * @param {number} stats.latency_ms        average round-trip latency in ms
     * @returns {{ node_id, score, breakdown }}
     */
    calculate(node_id, { uptime_pct = 100, jobs_total = 0, jobs_succeeded = 0, latency_ms = 50 }) {
        const uptimeScore = Math.max(0, Math.min(100, uptime_pct));
        const successRate = jobs_total > 0 ? (jobs_succeeded / jobs_total) * 100 : 100;
        const latencyScore = this._latencyScore(latency_ms);

        const { WEIGHTS: W } = NodeReputation;
        const composite = (
            uptimeScore * W.uptime +
            successRate * W.job_success_rate +
            latencyScore * W.latency
        );

        const score = Math.round(Math.max(0, Math.min(100, composite)));

        const breakdown = {
            uptime_score: Math.round(uptimeScore),
            success_score: Math.round(successRate),
            latency_score: Math.round(latencyScore),
            composite_score: score
        };

        return { node_id, score, breakdown };
    }

    /**
     * Calculate AND persist reputation for a node.
     */
    update(node_id, stats) {
        const result = this.calculate(node_id, stats);
        if (this.registry) {
            this.registry.setReputation(node_id, result.score);
        }
        return result;
    }

    /**
     * Convert a raw latency reading to a 0–100 score.
     * Ideal (≤ IDEAL_LATENCY_MS)  → 100
     * Worst (≥ WORST_LATENCY_MS)  → 0
     * Linear interpolation between.
     */
    _latencyScore(latency_ms) {
        const { IDEAL_LATENCY_MS: ideal, WORST_LATENCY_MS: worst } = NodeReputation;
        if (latency_ms <= ideal) return 100;
        if (latency_ms >= worst) return 0;
        return ((worst - latency_ms) / (worst - ideal)) * 100;
    }
}
