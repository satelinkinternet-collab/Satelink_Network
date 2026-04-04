import { rpcProvidersMap } from '../../core/config/rpc_providers.js';

export class ExecutionAssuranceRouter {
    constructor(registry, adapter, db) {
        this.registry = registry;
        this.fallbackAdapter = adapter;
        this.db = db;
        this._initialized = false;
    }

    async ensureTable() {
        if (this._initialized) return;
        try {
            await this.db.prepare(`CREATE TABLE IF NOT EXISTS execution_assurance_metrics (
                 id SERIAL PRIMARY KEY,
                 execution_source TEXT NOT NULL,
                 success_count INTEGER DEFAULT 0,
                 fallback_events INTEGER DEFAULT 0,
                 updated_at BIGINT
             )`).run();
            this._initialized = true;
        } catch (e) { }
    }

    async routeWorkload(chain, payload) {
        await this.ensureTable();

        // 1. Freshen dynamic state
        await this.registry.refreshCommunityCapacity();

        // 2. Identify authorized execution paths for this chain
        const priorityChainMap = rpcProvidersMap[chain] || rpcProvidersMap['ethereum'];

        for (const targetSource of priorityChainMap) {

            if (targetSource === 'community_nodes' || targetSource === 'genesis_nodes') {
                const availableLocalNodes = this.registry.getNodesByType(targetSource);

                if (availableLocalNodes.length > 0) {
                    const payloadResult = await this.fallbackAdapter.dispatch(targetSource, chain, payload);
                    await this.recordMetric(targetSource, false);
                    return {
                        status: 'executed',
                        source: targetSource,
                        nodeId: availableLocalNodes[0].node_id,
                        payloadResult
                    };
                }
                console.warn(`[ExecutionAssurance] ${targetSource} pool empty. Escalating chain priority.`);
            } else {
                try {
                    const payloadResult = await this.fallbackAdapter.dispatch(targetSource, chain, payload);
                    await this.recordMetric(targetSource, true);
                    return {
                        status: 'fallback_executed',
                        source: targetSource,
                        payloadResult
                    };
                } catch (e) {
                    console.error(`[ExecutionAssurance] Adapter failure on ${targetSource}. Escalating.`);
                }
            }
        }

        throw new Error(`[ExecutionAssurance] COMPLETE CATASTROPHIC FAILURE. All logical nodes and physical fallbacks failed or timed out for chain: ${chain}.`);
    }

    async recordMetric(source, isFallback) {
        try {
            const hasRow = await this.db.prepare("SELECT 1 FROM execution_assurance_metrics WHERE execution_source = ?").get(source);
            if (!hasRow) {
                await this.db.prepare("INSERT INTO execution_assurance_metrics (execution_source, updated_at) VALUES (?, ?)").run(source, Date.now());
            }

            await this.db.prepare(`
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
