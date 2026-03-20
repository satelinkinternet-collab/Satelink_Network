import { logger } from '../monitoring/logger.js';

/**
 * NodeCapacityManager tracks real-time resource availability from the DB.
 */
export class NodeCapacityManager {
    constructor(db) {
        this.db = db;
    }

    async getAvailableNodes() {
        try {
            // Select nodes where active_jobs < max_jobs
            // Join with registered_nodes to ensure node is active
            const nodes = await this.db.prepare(`
                SELECT nc.*
                FROM node_capacity nc
                JOIN registered_nodes rn ON nc.node_id = rn.wallet
                WHERE nc.active_jobs < nc.max_jobs
                  AND rn.active = 1
                ORDER BY nc.reputation_score DESC, nc.latency_score ASC
            `).all();
            return nodes;
        } catch (error) {
            logger.error({ error: error.message }, 'Failed to fetch available nodes');
            return [];
        }
    }

    async incrementActiveJobs(nodeId) {
        try {
            await this.db.prepare('UPDATE node_capacity SET active_jobs = active_jobs + 1 WHERE node_id = ?').run(nodeId);
        } catch (error) {
            logger.error({ error: error.message, nodeId }, 'Failed to increment node active jobs');
        }
    }

    async decrementActiveJobs(nodeId) {
        try {
            await this.db.prepare('UPDATE node_capacity SET active_jobs = MAX(0, active_jobs - 1) WHERE node_id = ?').run(nodeId);
        } catch (error) {
            logger.error({ error: error.message, nodeId }, 'Failed to decrement node active jobs');
        }
    }

    async updateNodeStats(nodeId, { reputation, latency }) {
        try {
            await this.db.prepare(`
                UPDATE node_capacity
                SET reputation_score = ?, latency_score = ?
                WHERE node_id = ?
            `).run(reputation, latency, nodeId);
        } catch (error) {
            logger.error({ error: error.message, nodeId }, 'Failed to update node stats');
        }
    }

    /**
     * Match a workload to the best available node.
     * Scoring considers: capacity headroom, reputation, latency, and workload type affinity.
     *
     * @param {Object} workload - { type, priority }
     * @param {Object} [opts] - { topN: number } return top N candidates (default 1)
     * @returns {Promise<Array<{ node_id, score, capacity_pct, reputation_score, latency_score }>>}
     */
    async matchWorkload(workload, opts = {}) {
        const topN = opts.topN || 1;

        try {
            const nodes = await this.getAvailableNodes();
            if (nodes.length === 0) return [];

            // Score each node
            const scored = nodes.map(node => {
                const capacityHeadroom = 1 - (node.active_jobs / Math.max(node.max_jobs, 1));
                const reputationNorm = (node.reputation_score || 50) / 100;
                const latencyPenalty = Math.min((node.latency_score || 100) / 500, 1); // lower is better

                // Workload type affinity: prefer nodes that have handled this type before
                let typeAffinity = 0.5; // neutral default
                if (node.supported_types) {
                    try {
                        const types = JSON.parse(node.supported_types);
                        if (Array.isArray(types) && types.includes(workload.type)) {
                            typeAffinity = 1.0;
                        }
                    } catch (e) { /* ignore parse errors */ }
                }

                // Priority boost: high/critical priority workloads prefer high-reputation nodes
                let priorityWeight = 1.0;
                if (workload.priority === 'CRITICAL') priorityWeight = 1.5;
                else if (workload.priority === 'HIGH') priorityWeight = 1.2;

                // Composite score (weighted sum, higher is better)
                const score = (
                    capacityHeadroom * 0.30 +
                    reputationNorm * 0.30 * priorityWeight +
                    (1 - latencyPenalty) * 0.25 +
                    typeAffinity * 0.15
                );

                return {
                    node_id: node.node_id,
                    score: Math.round(score * 1000) / 1000,
                    capacity_pct: Math.round(capacityHeadroom * 100),
                    reputation_score: node.reputation_score || 0,
                    latency_score: node.latency_score || 0
                };
            });

            // Sort by score descending, return top N
            scored.sort((a, b) => b.score - a.score);
            return scored.slice(0, topN);
        } catch (error) {
            logger.error({ error: error.message, workload_type: workload.type }, 'Workload matching failed');
            return [];
        }
    }
}
