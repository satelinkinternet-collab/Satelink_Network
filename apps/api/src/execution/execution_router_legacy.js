import { getCurrentEvolutionStage } from '../core/config/network_evolution.js';

export class ExecutionRouter {
    constructor(db) {
        this.db = db;
    }

    /**
     * Determine the execution source for an RPC request
     */
    async selectExecutionSource(chain, payload) {
        // Technically, you'd use communityNodeCount from DB
        const evolutionStage = getCurrentEvolutionStage(0);
        this.evolutionConfig = evolutionStage.distribution;
        // 1. Try Community Node with highest reputation
        const communityNode = this._findCommunityNode(chain);
        if (communityNode) {
            return { type: 'community_node', url: communityNode.url, id: communityNode.id };
        }

        // 2. Try Genesis Node (if no community node available)
        const genesisNode = this._findGenesisNode(chain);
        if (genesisNode) {
            return { type: 'genesis_node', url: genesisNode.url, id: genesisNode.id };
        }

        // 3. Try External Provider (if no network capacity)
        const externalProvider = this._findExternalProvider(chain);
        if (externalProvider) {
            return { type: 'external_provider', url: externalProvider.url, id: externalProvider.id };
        }

        throw new Error(`No execution capacity available for chain ${chain}`);
    }

    _findCommunityNode(chain) {
        // Query registered_nodes joined with node_capabilities matching chain
        // Ordered by reputation/latency
        // For now, we stub this until node_capabilities migration exists
        try {
            // A node is considered to support the chain if it's active and has the capability
            // Note: Since node_capabilities isn't created yet, we just return null safely if query fails
            const stmt = this.db.prepare(`
                SELECT n.wallet, n.latency, c.endpoint 
                FROM registered_nodes n
                JOIN node_capabilities c ON n.wallet = c.node_id
                WHERE n.active = 1 AND c.capability = 'rpc' AND c.chain = ?
                ORDER BY n.latency ASC
                LIMIT 1
            `);
            const node = stmt.get(chain);
            if (node) {
                return { id: node.wallet, url: node.endpoint || 'http://localhost:8545' };
            }
        } catch (e) {
            // expected to fail before migration
        }
        return null;
    }

    _findGenesisNode(chain) {
        try {
            const stmt = this.db.prepare(`
                SELECT node_id, endpoint 
                FROM genesis_nodes 
                WHERE status = 'ACTIVE' AND capabilities LIKE ?
                LIMIT 1
            `);
            const node = stmt.get(`%rpc_${chain}%`);
            if (node) {
                return { id: node.node_id, url: node.endpoint };
            }
        } catch (e) {
            // expected to fail before migration
        }
        return null;
    }

    _findExternalProvider(chain) {
        try {
            const stmt = this.db.prepare(`
                SELECT provider_name, endpoint 
                FROM external_providers 
                WHERE supported_chains LIKE ?
                ORDER BY latency_score ASC, cost_per_request ASC
                LIMIT 1
            `);
            const provider = stmt.get(`%${chain}%`);
            if (provider) {
                return { id: provider.provider_name, url: provider.endpoint };
            }
        } catch (e) {
            // expected to fail before migration
        }
        return null;
    }
}
