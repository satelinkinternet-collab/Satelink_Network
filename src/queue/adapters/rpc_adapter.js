/**
 * RPC Adapter
 *
 * Converts inbound RPC-style requests (eth_call, eth_sendRawTransaction, etc.)
 * into the normalised internal workload format:
 *   { op_type, target, payload, reward }
 *
 * Sources: JSON-RPC endpoints, WebSocket RPC relays
 */

export class RpcAdapter {
    /** Default reward for RPC calls (USD equivalent) */
    static DEFAULT_REWARD = 0.0005;

    /** Supported RPC methods this adapter accepts */
    static SUPPORTED_METHODS = new Set([
        'eth_call', 'eth_blockNumber', 'eth_getBalance', 'eth_sendRawTransaction',
        'eth_getTransactionReceipt', 'eth_getLogs', 'eth_estimateGas',
        'net_version', 'web3_clientVersion'
    ]);

    /**
     * Convert a raw RPC request into a normalised workload.
     *
     * @param {Object} raw
     * @param {string} raw.method          - JSON-RPC method name
     * @param {Array}  [raw.params]        - method parameters
     * @param {string} [raw.chain]         - target chain (default 'ethereum')
     * @param {number} [raw.reward]        - override reward
     * @returns {{ op_type, target, payload, reward }}
     */
    normalise(raw) {
        const { method, params = [], chain = 'ethereum', reward } = raw;

        if (!method) throw new Error('[RpcAdapter] method is required');

        return {
            op_type: 'rpc_call',
            target: chain,
            payload: { method, params },
            reward: reward ?? RpcAdapter.DEFAULT_REWARD
        };
    }

    /**
     * Returns true if this adapter can handle the given raw request.
     */
    canHandle(raw) {
        return raw && typeof raw.method === 'string' && RpcAdapter.SUPPORTED_METHODS.has(raw.method);
    }
}
