import { logger } from '../monitoring/logger.js';

/**
 * Fallback providers for when Genesis and Community nodes are unavailable.
 */
export class ProviderFallback {
    constructor() {
        this.providers = {
            ethereum: process.env.RPC_ETH_FALLBACK || 'https://eth.public-rpc.com',
            polygon: process.env.RPC_POLYGON_FALLBACK || 'https://polygon.drpc.org',
            arbitrum: process.env.RPC_ARBITRUM_FALLBACK || 'https://arb1.arbitrum.io/rpc',
            base: process.env.RPC_BASE_FALLBACK || 'https://mainnet.base.org'
        };
    }

    /**
     * Executes a workload via external RPC providers.
     * @param {Object} workload
     * @returns {Promise<Object>}
     */
    async executeExternal(workload) {
        const { type, payload } = workload;
        const chain = payload.chain || 'ethereum';
        const endpoint = this.providers[chain.toLowerCase()];

        if (!endpoint) {
            throw new Error(`No fallback provider for chain: ${chain}`);
        }

        logger.info({
            job_id: workload.id,
            chain,
            endpoint: new URL(endpoint).hostname
        }, 'execution_provider');

        try {
            // Standard JSON-RPC 2.0 dispatch
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: payload.method,
                    params: payload.params || [],
                    id: payload.id || Date.now()
                })
            });

            const result = await response.json();
            return {
                success: !result.error,
                data: result.result || result.error,
                source: 'external_provider',
                provider: endpoint
            };
        } catch (error) {
            logger.error({
                job_id: workload.id,
                error: error.message
            }, 'external_provider_failure');
            throw error;
        }
    }
}
