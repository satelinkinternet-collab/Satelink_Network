export class ISettlementAdapter {
    constructor(config) {
        this.config = config;
    }

    /**
     * Estimate fees for a batch of payouts
     * @param {Array} items - [{ wallet, amount }]
     * @returns {Promise<Object>} - { fee_estimate, currency }
     */
    async estimateFee(items) {
        throw new Error("Not implemented");
    }

    /**
     * Create and execute a payout batch
     * @param {Object} batch - { id, items: [...] }
     * @returns {Promise<Object>} - { external_id, status }
     */
    async createPayoutBatch(batch) {
        throw new Error("Not implemented");
    }

    /**
     * Get status of a batch
     * @param {String} batchId 
     * @returns {Promise<Object>} - { status, tx_hash, completed_at }
     */
    async getBatchStatus(batchId) {
        throw new Error("Not implemented");
    }

    /**
     * Cancel a batch (if possible)
     * @param {String} batchId 
     */
    async cancelBatch(batchId) {
        throw new Error("Not implemented");
    }
}
