
import { EvmAdapter } from './EvmAdapter.js';

export class ShadowEvmAdapter extends EvmAdapter {
    getName() {
        return `SHADOW_EVM:${this.chainName}`;
    }

    async createBatch(batch) {
        // Safe Mode for Shadow: Do NOT execute.
        // run estimate to verify logic/connectivity/syntax
        try {
            await this.estimateBatch(batch);
        } catch (e) {
            console.warn("[ShadowEVM] Estimate failed:", e);
            throw e; // Shadow failure should be logged
        }

        // Return a mock result comparison
        // We simulate a "processing" or "completed" state to compare against Primary.
        // If Primary is EVM, it returns 'processing' with ref 'EVM:...'.
        // We should return similar format but distinguished.

        return {
            status: 'processing',
            external_ref: `SHADOW_EVM:${this.chainName}:${batch.id}`,
            meta: { shadow: true, estimated: true }
        };
    }
}
