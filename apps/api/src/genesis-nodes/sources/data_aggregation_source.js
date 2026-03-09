/**
 * Data Aggregation Source
 *
 * Produces real data aggregation tasks:
 *   - fetch_crypto_prices     → pull latest token prices
 *   - update_token_metadata   → refresh token info (name, supply, holders)
 *   - scrape_defi_stats       → update protocol TVL, APY, volume
 *
 * Rotates across a fixed set of tokens and protocols to avoid repetition.
 * Each payload uniquely encodes the asset + timestamp bucket so identical
 * tasks in the same 60-second window are caught by the engine's dedup filter.
 */

const TOKENS = [
    'ETH', 'BTC', 'MATIC', 'ARB', 'OP', 'AVAX', 'SOL', 'LINK', 'UNI', 'AAVE'
];
const DEFI_PROTOCOLS = ['uniswap', 'aave', 'compound', 'curve', 'balancer'];
const TASK_TYPES = ['fetch_crypto_prices', 'update_token_metadata', 'scrape_defi_stats'];

export class DataAggregationSource {
    constructor(batchSize = 2) {
        this.name = 'data_aggregation';
        this.batchSize = batchSize;
        this._cycle = 0;
        this._counters = { generated: 0 };
    }

    /**
     * Generate data aggregation tasks.
     *
     * @returns {Array<{ op_type, target, payload, reward, source }>}
     */
    generate() {
        const tasks = [];
        const timeBucket = Math.floor(Date.now() / 60_000);   // changes every minute

        for (let i = 0; i < this.batchSize; i++) {
            const taskType = TASK_TYPES[(this._cycle + i) % TASK_TYPES.length];
            let payload;
            let target;

            switch (taskType) {
                case 'fetch_crypto_prices': {
                    const token = TOKENS[(this._cycle + i) % TOKENS.length];
                    target = 'coingecko';
                    payload = { source: this.name, operation: taskType, token, time_bucket: timeBucket };
                    break;
                }
                case 'update_token_metadata': {
                    const token = TOKENS[(this._cycle + i + 3) % TOKENS.length];
                    target = 'token_registry';
                    payload = { source: this.name, operation: taskType, token, time_bucket: timeBucket };
                    break;
                }
                case 'scrape_defi_stats': {
                    const protocol = DEFI_PROTOCOLS[(this._cycle + i) % DEFI_PROTOCOLS.length];
                    target = protocol;
                    payload = { source: this.name, operation: taskType, protocol, time_bucket: timeBucket };
                    break;
                }
            }

            tasks.push({ op_type: 'data_processing', target, payload, reward: 0.0001, source: this.name });
        }

        this._cycle++;
        this._counters.generated += tasks.length;
        return tasks;
    }

    stats() { return { source: this.name, ...this._counters }; }
}
