
/**
 * BaseSettlementAdapter
 * Abstract base class for all settlement adapters.
 * All methods must be implemented by subclasses.
 */
export class BaseSettlementAdapter {
    constructor() {
        if (new.target === BaseSettlementAdapter) {
            throw new TypeError("Cannot construct Abstract instances directly");
        }
    }

    getName() {
        throw new Error("Method 'getName()' must be implemented.");
    }

    /**
     * Estimate fees / gas for a batch.
     * @param {Object} batch - Batch object with items
     * @returns {Promise<{ fee_amount: number, currency: string, meta: Object }>}
     */
    async estimateBatch(batch) {
        throw new Error("Method 'estimateBatch()' must be implemented.");
    }

    /**
     * Validate a batch before creation (e.g. check balances, address formats).
     * @param {Object} batch 
     * @returns {Promise<{ valid: boolean, error?: string }>}
     */
    async validateBatch(batch) {
        throw new Error("Method 'validateBatch()' must be implemented.");
    }

    /**
     * Execute/Create the batch on the external network.
     * @param {Object} batch 
     * @returns {Promise<{ external_ref: string, status: string, meta: Object }>}
     */
    async createBatch(batch) {
        throw new Error("Method 'createBatch()' must be implemented.");
    }

    /**
     * Check status of an existing batch.
     * @param {string} external_ref 
     * @returns {Promise<{ status: string, tx_hash?: string, completed_at?: number }>}
     */
    async getBatchStatus(external_ref) {
        throw new Error("Method 'getBatchStatus()' must be implemented.");
    }

    /**
     * Attempt to cancel a batch if supported.
     * @param {string} external_ref 
     * @returns {Promise<{ success: boolean }>}
     */
    async cancelBatch(external_ref) {
        throw new Error("Method 'cancelBatch()' must be implemented.");
    }

    /**
     * fast health check of the adapter (connectivity, balance).
     * @returns {Promise<{ ok: boolean, latency_ms: number, error?: string }>}
     */
    async healthCheck() {
        throw new Error("Method 'healthCheck()' must be implemented.");
    }
}
