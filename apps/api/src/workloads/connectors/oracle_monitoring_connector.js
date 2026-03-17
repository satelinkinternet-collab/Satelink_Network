/**
 * Oracle & Monitoring Connector
 * 
 * Generates oracle workloads for nodes, including price feeds, gas monitors,
 * and API health checks.
 */

const ORACLE_JOB_TYPES = [
    { type: 'price_feed_update', target: 'price_feed', provider: 'coingecko', symbol: 'ETH', reward: 0.02 },
    { type: 'gas_price_monitor', target: 'network_stats', provider: 'ethereum_rpc', reward: 0.01 },
    { type: 'api_health_check', target: 'api_health', provider: 'public_uptime', reward: 0.005 },
    { type: 'network_latency_check', target: 'latency', provider: 'public_uptime', reward: 0.005 },
    { type: 'exchange_rate_update', target: 'exchange_rate', provider: 'binance', symbol: 'BTC/USDT', reward: 0.02 }
];

export class OracleMonitoringConnector {
    constructor() {
        this.name = 'oracle_monitoring';
        this._counters = {
            discovered: 0,
            accepted: 0,
            rejected: 0
        };
    }

    /**
     * Discover pending oracle workloads.
     * Simulated discovery logic.
     */
    async discover() {
        const workloads = [];
        // Generate 1-2 jobs per cycle
        const count = Math.floor(Math.random() * 2) + 1;

        for (let i = 0; i < count; i++) {
            const jobInfo = ORACLE_JOB_TYPES[Math.floor(Math.random() * ORACLE_JOB_TYPES.length)];

            const payload = {
                provider: jobInfo.provider
            };
            if (jobInfo.symbol) payload.symbol = jobInfo.symbol;

            workloads.push({
                op_type: 'oracle_fetch',
                target: jobInfo.target,
                payload: payload,
                reward: jobInfo.reward,
                source: this.name
            });
        }

        this._counters.discovered += workloads.length;
        return workloads;
    }

    stats() {
        return {
            source: this.name,
            ...this._counters
        };
    }
}
