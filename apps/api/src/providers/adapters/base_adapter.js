export class BaseAdapter {
    constructor(chainName) {
        this.chainName = chainName;
    }

    /**
     * Validate the JSON-RPC request format
     */
    validateRequest(payload) {
        if (!payload || typeof payload !== 'object') {
            return { valid: false, error: 'Invalid JSON-RPC payload' };
        }

        // Handle batch requests
        if (Array.isArray(payload)) {
            if (payload.length === 0) return { valid: false, error: 'Empty batch request' };
            for (const req of payload) {
                const res = this._validateSingleRequest(req);
                if (!res.valid) return res;
            }
            return { valid: true, isBatch: true };
        }

        return this._validateSingleRequest(payload);
    }

    _validateSingleRequest(req) {
        if (!req.jsonrpc || req.jsonrpc !== '2.0') {
            return { valid: false, error: 'Invalid jsonrpc version' };
        }
        if (!req.method || typeof req.method !== 'string') {
            return { valid: false, error: 'Invalid or missing method' };
        }
        return { valid: true, isBatch: false, method: req.method };
    }

    /**
     * Build the request to forward to a node
     */
    buildForwardRequest(payload, targetUrl) {
        return {
            url: targetUrl,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        };
    }

    /**
     * Execute the forwarded request
     */
    async forward(payload, targetUrl) {
        const start = Date.now();
        try {
            const reqData = this.buildForwardRequest(payload, targetUrl);
            const response = await fetch(reqData.url, {
                method: reqData.method,
                headers: reqData.headers,
                body: reqData.body,
                timeout: 5000 // 5s timeout
            });

            const latency = Date.now() - start;

            if (!response.ok) {
                return { success: false, error: `HTTP ${response.status}`, latency };
            }

            const data = await response.json();
            return { success: true, data, latency };
        } catch (error) {
            return { success: false, error: error.message, latency: Date.now() - start };
        }
    }

    /**
     * Measure network specific metrics if necessary
     */
    emitMetrics(latency, success, method) {
        // Implement metric emission logic, possibly integrating with a Logger or EventBus
        return { chain: this.chainName, latency, success, method, timestamp: Date.now() };
    }
}
