/**
 * Node Leaderboard (Module 2)
 *
 * Tracks and ranks nodes by earnings performance.
 *
 * Data sources (graceful fallback if tables don't exist):
 *   - node_growth_stats   (managed by this module)
 *   - node_registry       (active status, reputation)
 *   - workload_metrics    (cross-reference for totals)
 *
 * The leaderboard is the primary growth attraction mechanism:
 * prospective operators see real earnings and decide to join.
 *
 * Exposed via: GET /v1/nodes/leaderboard
 */

export class NodeLeaderboard {
    constructor(db) {
        this.db = db;
    }

    async init() {
        try {
            await this.db.prepare(`
                CREATE TABLE IF NOT EXISTS node_growth_stats (
                    node_id         TEXT PRIMARY KEY,
                    jobs_completed  INTEGER DEFAULT 0,
                    earnings_today  REAL    DEFAULT 0,
                    earnings_total  REAL    DEFAULT 0,
                    last_active     INTEGER,
                    updated_at      INTEGER
                )
            `).run();
        } catch (e) {
            console.warn('[NodeLeaderboard] Init:', e.message);
        }
        return true;
    }

    /**
     * Record a completed job for a node.
     * Called by the integration layer after a job succeeds.
     *
     * @param {string} node_id
     * @param {number} reward     — USD value of the job
     */
    async recordJob(node_id, reward = 0) {
        const now = Date.now();
        try {
            // Upsert into growth stats
            await this.db.prepare(`
                INSERT INTO node_growth_stats (node_id, jobs_completed, earnings_today, earnings_total, last_active, updated_at)
                VALUES (?, 1, ?, ?, ?, ?)
                ON CONFLICT(node_id) DO UPDATE SET
                    jobs_completed = jobs_completed + 1,
                    earnings_today = earnings_today + excluded.earnings_today,
                    earnings_total = earnings_total + excluded.earnings_total,
                    last_active    = excluded.last_active,
                    updated_at     = excluded.updated_at
            `).run(node_id, reward, reward, now, now);
        } catch (e) {
            console.warn('[NodeLeaderboard] recordJob:', e.message);
        }
    }

    /**
     * Reset earnings_today for all nodes (called at epoch/day boundary).
     */
    async resetDailyEarnings() {
        try {
            await this.db.prepare('UPDATE node_growth_stats SET earnings_today = 0').run();
        } catch (_) { /* non-fatal */ }
    }

    /**
     * Return top-N nodes sorted by earnings_total DESC.
     *
     * @param {number} limit
     * @returns {Array<{ rank, node_id, jobs_completed, earnings_today, earnings_total }>}
     */
    async getLeaderboard(limit = 50) {
        try {
            const rows = await this.db.prepare(`
                SELECT
                    g.node_id,
                    g.jobs_completed,
                    ROUND(g.earnings_today::numeric, 6)  AS earnings_today,
                    ROUND(g.earnings_total::numeric, 6)  AS earnings_total,
                    n.reputation,
                    n.status
                FROM node_growth_stats g
                LEFT JOIN node_registry n ON n.node_id = g.node_id
                ORDER BY g.earnings_total DESC, g.jobs_completed DESC
                LIMIT ?
            `).all(limit);

            return rows.map((r, i) => ({ rank: i + 1, ...r }));
        } catch (_) {
            return [];
        }
    }

    /**
     * Summary stats for the leaderboard endpoint.
     */
    async summary() {
        try {
            const row = await this.db.prepare(`
                SELECT
                    COUNT(*)             AS total_ranked,
                    SUM(jobs_completed)  AS total_jobs,
                    SUM(earnings_total)  AS total_paid,
                    MAX(earnings_total)  AS top_earner_total
                FROM node_growth_stats
            `).get();
            return {
                total_ranked: row?.total_ranked || 0,
                total_jobs: row?.total_jobs || 0,
                total_paid: Math.round((row?.total_paid || 0) * 10000) / 10000,
                top_earner_total: Math.round((row?.top_earner_total || 0) * 10000) / 10000
            };
        } catch (_) {
            return { total_ranked: 0, total_jobs: 0, total_paid: 0, top_earner_total: 0 };
        }
    }
}
