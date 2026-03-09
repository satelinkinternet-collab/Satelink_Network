
import { SimulatedAdapter } from './SimulatedAdapter.js';

export class ShadowAdapter extends SimulatedAdapter {
    getName() {
        return 'SHADOW';
    }

    async createBatch(batch) {
        // Shadow adapter behaves like simulated but returns different meta
        const result = await super.createBatch(batch);
        result.meta = {
            ...result.meta,
            shadow: true,
            shadow_timestamp: Date.now()
        };
        // Intentionally create a "mismatch" in external_ref format to verify diff logic
        result.external_ref = `shadow_${result.external_ref}`;
        return result;
    }
}
