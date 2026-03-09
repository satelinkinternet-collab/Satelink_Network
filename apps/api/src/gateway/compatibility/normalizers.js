/**
 * Normalizers — Compatibility Gateway
 *
 * Convert each supported external format into a DemandBuffer-compatible workload:
 *   { op_type, target, payload, reward }
 *
 * op_type must be one of the values accepted by DemandBuffer._validateWorkload():
 *   'rpc_call' | 'ai_inference' | 'automation_job' | 'webhook_delivery' | 'data_processing'
 */

const DEFAULT_REWARDS = {
    rpc_call: 0.0002,
    ai_inference: 0.0010,
    webhook_delivery: 0.0003,
    data_processing: 0.0005
};

// ── Ethereum JSON-RPC ────────────────────────────────────────────────────────

/**
 * Normalize a JSON-RPC request body into a Satelink rpc_call workload.
 *
 * @param {Object} body          — { jsonrpc, method, params, id }
 * @param {string} [clientId]
 * @returns {{ op_type, target, payload, reward }}
 */
export function normalizeEthRpc(body, clientId = 'anonymous') {
    // Infer chain from body if present (e.g. body.chain = 'polygon')
    const chain = body.chain || 'ethereum';

    return {
        op_type: 'rpc_call',
        target: chain,
        payload: {
            jsonrpc: body.jsonrpc || '2.0',
            method: body.method,
            params: body.params || [],
            id: body.id || Date.now(),
            client_id: clientId
        },
        reward: DEFAULT_REWARDS.rpc_call
    };
}

// ── Generic Compute Job ───────────────────────────────────────────────────────

/**
 * Normalize a compute job body into a Satelink ai_inference / data_processing workload.
 *
 * @param {Object} body          — { type, model?, input }
 * @param {string} [clientId]
 * @returns {{ op_type, target, payload, reward }}
 */
export function normalizeComputeJob(body, clientId = 'anonymous') {
    // Map incoming type to DemandBuffer's known op_types
    const opTypeMap = {
        ai_inference: 'ai_inference',
        embedding: 'ai_inference',
        llm_completion: 'ai_inference',
        data_processing: 'data_processing'
    };

    const op_type = opTypeMap[body.type] || 'ai_inference';
    const target = body.model || body.type;

    return {
        op_type,
        target,
        payload: {
            type: body.type,
            model: body.model || null,
            input: body.input || null,
            params: body.params || {},
            client_id: clientId
        },
        reward: DEFAULT_REWARDS[op_type] ?? DEFAULT_REWARDS.ai_inference
    };
}

// ── Webhook Event ─────────────────────────────────────────────────────────────

/**
 * Normalize a webhook event body into a Satelink webhook_delivery workload.
 *
 * @param {Object} body          — { url?, event?, payload? }
 * @param {string} [clientId]
 * @returns {{ op_type, target, payload, reward }}
 */
export function normalizeWebhook(body, clientId = 'anonymous') {
    // Target is either the destination URL or a generic label
    const target = body.url || body.event || `webhook_${clientId}`;

    return {
        op_type: 'webhook_delivery',
        target,
        payload: {
            url: body.url || null,
            event: body.event || null,
            body: body.payload || body.data || body,
            retry_policy: body.retry_policy || { max_retries: 3, delay_ms: 1000 },
            client_id: clientId
        },
        reward: DEFAULT_REWARDS.webhook_delivery
    };
}
