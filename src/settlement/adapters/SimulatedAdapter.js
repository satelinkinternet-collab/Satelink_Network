import { BaseSettlementAdapter } from './BaseSettlementAdapter.js';

export class SimulatedAdapter extends BaseSettlementAdapter {
    getName() {
        return 'SIMULATED';
    }

    async estimateBatch(batch) {
        // Mock 1 USDT fee
        return { fee_amount: 1.0, currency: 'USDT', meta: { mock_gas: 50000 } };
    }

    async validateBatch(batch) {
        // Always valid in simulation unless strictly defined bad data
        if (!batch.items || batch.items.length === 0) return { valid: false, error: "Empty batch" };
        return { valid: true };
    }

    async createBatch(batch) {
        const ref = `sim_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        // Instant success for simulation
        return {
            external_ref: ref,
            status: 'completed',
            meta: { simulated: true }
        };
    }

    async getBatchStatus(external_ref) {
        // Always completed
        return { status: 'completed', tx_hash: `0xmock${external_ref}`, completed_at: Date.now() };
    }

    async cancelBatch(external_ref) {
        return { success: false }; // Can't cancel instant mock
    }

    async healthCheck() {
        return { ok: true, latency_ms: 1 };
    }
}
