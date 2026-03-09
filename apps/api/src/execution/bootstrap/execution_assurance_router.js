import { rpcProvidersMap } from '../../core/config/rpc_providers.js';

export class ExecutionAssuranceRouter {
    constructor(registry, adapter, db) {
        this.registry = registry;
        this.fallbackAdapter = adapter;
        this.db = db;

        // Mock table ensures execution_assurance_metrics exist if not in Schema natively 
        try {
            this.db.prepare(`CREATE TABLE IF NOT EXISTS execution_assurance_metrics (
                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                 execution_source TEXT NOT NULL,
                 success_count INTEGER DEFAULT 0,
                 fallback_events INTEGER DEFAULT 0,
                 updated_at BIGINT
             )`).run();
        } catch (e) { }
    }

    async routeWorkload(chain, payload) {
        // 1. Freshen dynamic state
        await this.registry.refreshCommunityCapacity();

        // 2. Identify authorized execution paths for this chain
        const priorityChainMap = rpcProvidersMap[chain] || rpcProvidersMap['ethereum'];

        for (const targetSource of priorityChainMap) {

            if (targetSource === 'community_nodes' || targetSource === 'genesis_nodes') {
                const availableLocalNodes = this.registry.getNodesByType(targetSource);

                if (availableLocalNodes.length > 0) {
                    // In real scenarios, route via ExecutionRouter or direct payload hit
                    // Here we mock the generic "success" state locally terminating traffic
                    this.recordMetric(targetSource, false);
                    return {
                        status: 'executed',
                        source: targetSource,
                        nodeId: availableLocalNodes[0].node_id,
                        payloadResult: '0xLocalExecutionMock'
                    };
                }
                console.warn(`[ExecutionAssurance] ${targetSource} pool empty. Escalating chain priority.`);
            } else {
                // It is a specific external provider (infura, alchemy, quicknode)
                // console.warn(`[ExecutionAssurance] Engaging Provider Fallback Adapter -> ${targetSource}`); // Removed as per instruction

                try {
                    const result = await this.fallbackAdapter.dispatch(targetSource, chain, payload);
                    this.recordMetric(targetSource, true);
                    return {
                        status: 'fallback_executed',
                        source: targetSource,
                        payloadResult: result
                    };
                } catch (e) {
                    console.error(`[ExecutionAssurance] Adapter failure on ${targetSource}. Escalating.`);
                }
            }
        }

        throw new Error(`[ExecutionAssurance] COMPLETE CATASTROPHIC FAILURE. All logical nodes and physical fallbacks failed or timed out for chain: ${chain}.`);
    }

    recordMetric(source, isFallback) {
        try {
            const hasRow = this.db.prepare("SELECT 1 FROM execution_assurance_metrics WHERE execution_source = ?").get(source);
            if (!hasRow) {
                this.db.prepare("INSERT INTO execution_assurance_metrics (execution_source, updated_at) VALUES (?, ?)").run(source, Date.now());
            }

            this.db.prepare(`
                UPDATE execution_assurance_metrics 
                SET success_count = success_count + 1,
                    fallback_events = fallback_events + ?
                WHERE execution_source = ?
            `).run(isFallback ? 1 : 0, source);
        } catch (e) {
            console.error(e.message)
        }
    }
}
