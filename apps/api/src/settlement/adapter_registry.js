
import { ShadowAdapter } from './adapters/ShadowAdapter.js';
import { NodeOpsAdapter } from './adapters/NodeOpsAdapter.js';

// Map SETTLEMENT_ADAPTER env values to registered adapter names.
// Polygon is the primary chain; Fuse is retained for legacy migrations only.
const ADAPTER_ALIAS = {
    polygon: 'POLYGON_USDT',
    fuse: 'FUSE_USDT',
    evm: 'EVM',
    shadow: 'SHADOW',
    simulated: 'SIMULATED',
};

export class AdapterRegistry {
    constructor() {
        this.adapters = new Map();
        const envAdapter = (process.env.SETTLEMENT_ADAPTER || '').toLowerCase();
        this.activeAdapterName = ADAPTER_ALIAS[envAdapter] || 'SIMULATED';
    }

    register(instance) {
        if (!instance.getName()) throw new Error("Adapter has no name");
        this.adapters.set(instance.getName(), instance);
        console.log(`[AdapterRegistry] Registered: ${instance.getName()}`);
    }

    setActive(name) {
        if (!this.adapters.has(name)) throw new Error(`Adapter ${name} not found`);
        this.activeAdapterName = name;
        console.log(`[AdapterRegistry] Switched Active Adapter to: ${name}`);
    }

    getActive() {
        return this.adapters.get(this.activeAdapterName);
    }

    get(name) {
        return this.adapters.get(name);
    }

    list() {
        return Array.from(this.adapters.keys());
    }
}
