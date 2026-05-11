import { externalEndpoints } from '../../core/config/rpc_providers.js';

export class ProviderFallbackAdapter {
    constructor() {
        // Simple memory cache for retry logic
        this.maxRetries = 2;
    }

    /**
     * Executes raw rpc_call directly against external infrastructure.
     * Uses real HTTP for chains with valid RPC URLs.
     */
    async executeRpc(providerName, chain, payload) {
        const url = externalEndpoints[providerName];
        if (!url) throw new Error(`Unknown external provider endpoint for ${providerName}`);

        // Skip mock for SATELINK_INTERNAL placeholder URLs
        if (url.includes('SATELINK_INTERNAL')) {
            return {
                status: 'success',
                provider: providerName,
                chain: chain,
                jsonrpc: '2.0',
                id: payload.id || 1,
                result: '0xMockProviderPayloadExecution'
            };
        }

        // Real RPC call
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: payload.method,
                params: payload.params || [],
                id: payload.id || 1
            })
        });

        if (!response.ok) {
            throw new Error(`RPC request failed: ${response.status}`);
        }

        const data = await response.json();
        return {
            status: 'success',
            provider: providerName,
            chain: chain,
            ...data
        };
    }

    async dispatch(providerName, chain, payload) {
        let attempts = 0;

        while (attempts < this.maxRetries) {
            try {
                console.log(`[ProviderFallbackAdapter] Transmitting RPC to external provider ${providerName}... (Attempt ${attempts + 1})`);
                return await this.executeRpc(providerName, chain, payload);
            } catch (e) {
                attempts++;
                console.error(`[ProviderFallbackAdapter] ${providerName} connection failed:`, e.message);
                if (attempts >= this.maxRetries) throw e;
            }
        }
    }
}
