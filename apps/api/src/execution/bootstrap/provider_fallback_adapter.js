export class ProviderFallbackAdapter {
    constructor() {
        this.maxRetries = 2;
    }

    async forwardRpcPayload(payload) {
        if (!process.env.RPC_PROVIDER_URL) {
            throw new Error('RPC_PROVIDER_URL is not configured');
        }

        const response = await fetch(process.env.RPC_PROVIDER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json().catch(() => null);
        if (!response.ok) {
            throw new Error(`RPC provider responded with HTTP ${response.status}`);
        }
        if (data === null) {
            throw new Error('RPC provider returned a non-JSON response');
        }

        return data;
    }

    async dispatch(providerName, chain, payload) {
        let attempts = 0;
        let lastError;

        while (attempts < this.maxRetries) {
            try {
                return await this.forwardRpcPayload(payload);
            } catch (error) {
                attempts += 1;
                lastError = error;
                console.error(`[ProviderFallbackAdapter] ${providerName} dispatch failure for ${chain} (attempt ${attempts}):`, error.message);
            }
        }

        throw lastError || new Error(`[ProviderFallbackAdapter] Failed to dispatch payload for ${providerName}`);
    }
}
