import { externalEndpoints } from '../../core/config/rpc_providers.js';

export class ProviderFallbackAdapter {
    constructor() {
        // Simple memory cache for retry logic
        this.maxRetries = 2;
    }

    /**
     * Executes raw rpc_call directly against external infrastructure
     * Mock implementation simulating HTTP overhead for the network tests.
     */
    async executeMockHttp(providerName, chain, payload) {
        return new Promise((resolve, reject) => {
            const url = externalEndpoints[providerName];
            if (!url) return reject(new Error(`Unknown external provider endpoint for ${providerName}`));

            // Simulating ~150ms HTTP transit to infura/alchemy 
            setTimeout(() => {
                resolve({
                    status: 'success',
                    provider: providerName,
                    chain: chain,
                    jsonrpc: '2.0',
                    id: payload.id || 1,
                    result: '0xMockProviderPayloadExecution'
                });
            }, 100);
        });
    }

    async dispatch(providerName, chain, payload) {
        let attempts = 0;

        while (attempts < this.maxRetries) {
            try {
                console.log(`[ProviderFallbackAdapter] Transmitting abstract RPC to external provider ${providerName}... (Attempt ${attempts + 1})`);
                return await this.executeMockHttp(providerName, chain, payload);
            } catch (e) {
                attempts++;
                console.error(`[ProviderFallbackAdapter] ${providerName} connection failed:`, e.message);
                if (attempts >= this.maxRetries) throw e;
            }
        }
    }
}
