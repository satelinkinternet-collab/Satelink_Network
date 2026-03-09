/**
 * Node-Aware Execution Router
 *
 * Module 5 — Router Integration
 *
 * Wraps the existing ExecutionRouter with Node Registry awareness.
 * Routing priority (per spec):
 *   1. Genesis nodes
 *   2. Community nodes  ← fetched live from node_registry
 *   3. External providers
 *
 * This module does NOT modify the original ExecutionRouter class.
 * It decorates it by overriding the community-node selection step
 * to pull from the new node_registry table instead of registered_nodes.
 */

import { NodeRegistry } from './node_registry.js';
import { NodeCapacity } from './node_capacity.js';

export class NodeAwareRouter {
    /**
     * @param {Object} db  - better-sqlite3 database instance
     * @param {Object} [baseRouter] - optional ExistingExecutionRouter instance
     */
    constructor(db, baseRouter = null) {
        this.db = db;
        this.baseRouter = baseRouter;
        this.registry = new NodeRegistry(db);
        this.capacity = new NodeCapacity(this.registry);
    }

    /**
     * Select the best execution source for a given chain.
     *
     * Priority order:
     *   1. genesis_node   from node_registry
     *   2. community node from node_registry (highest reputation)
     *   3. external_provider via base router fallback (if available)
     *
     * @param {string} chain
     * @param {Object} payload
     * @returns {Promise<{type, node_id, url}>}
     */
    async selectExecutionSource(chain, payload = {}) {
        // ── 1. Genesis nodes ────────────────────────────────────────────────
        const genesisNode = this._findInRegistry('genesis', chain);
        if (genesisNode) {
            return {
                type: 'genesis_node',
                node_id: genesisNode.node_id,
                url: genesisNode.endpoint || `http://${genesisNode.node_id}:8545`,
                source: 'node_registry'
            };
        }

        // ── 2. Community nodes (highest reputation, has capacity) ───────────
        const communityNode = this._findInRegistry('community', chain);
        if (communityNode) {
            return {
                type: 'community_node',
                node_id: communityNode.node_id,
                url: communityNode.endpoint || `http://${communityNode.node_id}:8545`,
                source: 'node_registry'
            };
        }

        // ── 3. Delegate to base router for external provider fallback ────────
        if (this.baseRouter && typeof this.baseRouter.selectExecutionSource === 'function') {
            return this.baseRouter.selectExecutionSource(chain, payload);
        }

        throw new Error(`[NodeAwareRouter] No execution capacity available for chain: ${chain}`);
    }

    /**
     * Surface node network metrics for the metrics layer.
     * Tracked: total_nodes, active_nodes, capacity_available
     */
    getMetrics() {
        return this.registry.getMetrics();
    }

    // ─── Private ─────────────────────────────────────────────────────────────

    /**
     * Query node_registry for the best available node of a given type.
     * Ordered by reputation DESC, capacity DESC.
     *
     * @param {'genesis'|'community'} type
     * @param {string} chain - not directly filterable yet; kept for future capability matching
     * @returns {Object|null}
     */
    _findInRegistry(type, chain) {
        try {
            return this.db.prepare(`
                SELECT node_id, node_type, region, capacity, reputation, status
                FROM node_registry
                WHERE node_type = ? AND status = 'ACTIVE' AND capacity > 0
                ORDER BY reputation DESC, capacity DESC
                LIMIT 1
            `).get(type);
        } catch (e) {
            // Table may not exist yet — fail silently
            return null;
        }
    }
}
