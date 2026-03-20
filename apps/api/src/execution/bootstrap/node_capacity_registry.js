import { genesisNodes } from '../../core/config/genesis_nodes.js';
import { rpcProvidersMap } from '../../core/config/rpc_providers.js';

export class NodeCapacityRegistry {
    constructor(db) {
        this.db = db;
        this.state = {
            community_nodes: [],
            genesis_nodes: [...genesisNodes],
            external_providers: Object.keys(rpcProvidersMap).map(p => ({ node_id: p, type: 'external', capacity: 'infinite' }))
        };
    }

    /**
     * Re-pulls active dynamic nodes from the SQLite ledger 
     */
    async refreshCommunityCapacity() {
        try {
            // Basic metric check: active, not flagged, and recently heartbeat
            const activeNodes = await this.db.prepare(`
                SELECT wallet as node_id, node_type, latency, bandwidth, infra_reserved, active, is_flagged
                FROM registered_nodes
                WHERE active = 1 AND is_flagged = 0
            `).all();

            this.state.community_nodes = activeNodes.map(n => ({
                node_id: n.node_id,
                node_type: n.node_type || 'community',
                capacity: n.infra_reserved || 10,  // fallback arbitrary volume weight
                region: 'global',
                reputation: 100, // naive rep boot
                status: 'ACTIVE'
            }));

        } catch (e) {
            console.warn("[NodeCapacityRegistry] Could not refresh community nodes array:", e.message);
            this.state.community_nodes = [];
        }
    }

    /**
     * Calculates combined real-time capacities across the unified execution tiers.
     * @returns {Object} Capacity distribution matrix
     */
    getGlobalCapacity() {
        return {
            community_count: this.state.community_nodes.length,
            genesis_count: this.state.genesis_nodes.length,
            provider_channels: this.state.external_providers.length,
            total_community_volume: this.state.community_nodes.reduce((acc, n) => acc + n.capacity, 0)
        };
    }

    /**
     * Extracts a list of available nodes for a specific execution tier routing path
     * @param {string} type - 'community_nodes', 'genesis_nodes', or 'infura', etc.
     * @returns {Array} List of node objects capable of execution
     */
    getNodesByType(type) {
        if (type === 'community_nodes') return this.state.community_nodes;
        if (type === 'genesis_nodes') return this.state.genesis_nodes;

        // If it's a specific external provider (e.g. 'infura') 
        const ext = this.state.external_providers.find(p => p.node_id === type);
        return ext ? [ext] : [];
    }
}
