/**
 * Blockchain Indexer Source
 *
 * Produces real blockchain indexing tasks:
 *   - fetch_block          → fetch a block by number
 *   - parse_transactions   → decode transactions in a block
 *   - update_metrics       → refresh on-chain analytics
 *
 * Tracks the last indexed block per chain and advances forward each cycle,
 * which ensures every workload has a unique payload (no duplicates).
 */

const CHAINS = ['ethereum', 'polygon', 'arbitrum', 'base'];

// Realistic starting blocks (approximately current at build time)
const CHAIN_START_BLOCKS = {
    ethereum: 19_200_000,
    polygon: 54_000_000,
    arbitrum: 190_000_000,
    base: 10_500_000
};

const TASK_TYPES = ['fetch_block', 'parse_transactions', 'update_metrics'];

export class BlockchainIndexerSource {
    constructor(batchSize = 3) {
        this.name = 'blockchain_indexer';
        this.batchSize = batchSize;
        this._heads = { ...CHAIN_START_BLOCKS };
        this._counters = { generated: 0 };
    }

    /**
     * Generate blockchain indexing tasks.
     * Advances block heads by 1 each cycle (realistic block progression).
     *
     * @returns {Array<{ op_type, target, payload, reward, source }>}
     */
    generate() {
        const tasks = [];

        for (let i = 0; i < this.batchSize; i++) {
            const chain = CHAINS[i % CHAINS.length];
            const task_type = TASK_TYPES[i % TASK_TYPES.length];
            const block_number = this._heads[chain]++;

            tasks.push({
                op_type: 'data_processing',
                target: chain,
                payload: {
                    source: this.name,
                    operation: task_type,
                    chain,
                    block_number,
                    task_id: `${chain}_${task_type}_${block_number}`
                },
                reward: 0.0001,
                source: this.name
            });
        }

        this._counters.generated += tasks.length;
        return tasks;
    }

    stats() { return { source: this.name, ...this._counters }; }
}
