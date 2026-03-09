/**
 * RPC Source Connector
 *
 * Discovers RPC workloads from configured endpoint lists, normalises them
 * into DemandBuffer-compatible format, and pushes them for scheduling.
 *
 * In production these would be live JSON-RPC endpoints (Alchemy, Infura,
 * custom node pools). In simulation mode the connector generates synthetic
 * RPC workloads based on realistic chain distributions.
 */

const SUPPORTED_CHAINS = ['ethereum', 'polygon', 'arbitrum', 'base'];
const COMMON_METHODS = ['eth_blockNumber', 'eth_getBalance', 'eth_call', 'eth_gasPrice', 'eth_getTransactionReceipt'];
const DEFAULT_REWARD = 0.0002;

export class RPCConnector {
    constructor(opts = {}) {
        this.name = 'rpc';
        this.enabled = true;
        this.endpoints = opts.endpoints || SUPPORTED_CHAINS.map(c => ({ chain: c, url: `https://rpc.satelink.network/${c}` }));
        this._counters = { discovered: 0, accepted: 0, rejected: 0 };
    }

    /**
     * Discover pending RPC workloads.
     * In simulation mode, returns a small batch of synthetic entries.
     *
     * @returns {Array<{ op_type, target, payload, reward, source }>}
     */
    async discover() {
        if (!this.enabled) return [];

        const workloads = [];
        // Simulate discovering pending RPC requests across endpoints
        const count = Math.floor(Math.random() * 4) + 1;   // 1-4 per cycle
        for (let i = 0; i < count; i++) {
            const chain = SUPPORTED_CHAINS[Math.floor(Math.random() * SUPPORTED_CHAINS.length)];
            const method = COMMON_METHODS[Math.floor(Math.random() * COMMON_METHODS.length)];
            workloads.push({
                op_type: 'rpc_call',
                target: chain,
                payload: {
                    jsonrpc: '2.0',
                    method,
                    params: [],
                    id: Date.now() + i
                },
                reward: DEFAULT_REWARD,
                source: 'rpc',
                _discovered_at: Date.now()
            });
        }
        this._counters.discovered += workloads.length;
        return workloads;
    }

    stats() {
        return { source: this.name, enabled: this.enabled, ...this._counters };
    }
}
