import { logger } from '../monitoring/logger.js';

export class CapacityManager {
    constructor(db) {
        this.db = db;
    }

    /**
     * Fetch available Genesis Nodes.
     * @returns {Promise<Array>}
     */
    async getAvailableGenesisNodes() {
        try {
            const nodes = this.db.prepare(`
                SELECT * FROM genesis_nodes 
                WHERE status = 'ACTIVE'
            `).all();
            return nodes;
        } catch (error) {
            logger.error({ error: error.message }, 'Failed to fetch genesis nodes');
            return [];
        }
    }

    /**
     * Fetch available Community Nodes from registered_nodes + node_capacity.
     * @returns {Promise<Array>}
     */
    async getAvailableCommunityNodes() {
        try {
            const nodes = this.db.prepare(`
                SELECT nc.*, rn.node_type 
                FROM node_capacity nc
                JOIN registered_nodes rn ON nc.node_id = rn.wallet
                WHERE nc.active_jobs < nc.max_jobs
                  AND rn.active = 1
                  AND rn.is_flagged = 0
                ORDER BY nc.reputation_score DESC, nc.latency_score ASC
            `).all();
            return nodes;
        } catch (error) {
            logger.error({ error: error.message }, 'Failed to fetch community nodes');
            return [];
        }
    }

    /**
     * Records workload assignment in the DB tracker.
     */
    async assignWorkload(nodeId, nodeType = 'community') {
        try {
            if (nodeType === 'community') {
                this.db.prepare('UPDATE node_capacity SET active_jobs = active_jobs + 1 WHERE node_id = ?').run(nodeId);
            }
            // Genesis nodes might have separate tracking if needed, 
            // but for now we assume they are high-capacity and handle multiple slots.
        } catch (error) {
            logger.error({ error: error.message, nodeId }, 'Failed to assign workload');
        }
    }

    async releaseWorkload(nodeId, nodeType = 'community') {
        try {
            if (nodeType === 'community') {
                this.db.prepare('UPDATE node_capacity SET active_jobs = MAX(0, active_jobs - 1) WHERE node_id = ?').run(nodeId);
            }
        } catch (error) {
            logger.error({ error: error.message, nodeId }, 'Failed to release workload');
        }
    }
}
