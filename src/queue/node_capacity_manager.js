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
            const nodes = this.db.prepare(`
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
            this.db.prepare('UPDATE node_capacity SET active_jobs = active_jobs + 1 WHERE node_id = ?').run(nodeId);
        } catch (error) {
            logger.error({ error: error.message, nodeId }, 'Failed to increment node active jobs');
        }
    }

    async decrementActiveJobs(nodeId) {
        try {
            this.db.prepare('UPDATE node_capacity SET active_jobs = MAX(0, active_jobs - 1) WHERE node_id = ?').run(nodeId);
        } catch (error) {
            logger.error({ error: error.message, nodeId }, 'Failed to decrement node active jobs');
        }
    }

    async updateNodeStats(nodeId, { reputation, latency }) {
        try {
            this.db.prepare(`
                UPDATE node_capacity 
                SET reputation_score = ?, latency_score = ? 
                WHERE node_id = ?
            `).run(reputation, latency, nodeId);
        } catch (error) {
            logger.error({ error: error.message, nodeId }, 'Failed to update node stats');
        }
    }
}
