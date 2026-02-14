
export class AdapterRegistry {
    constructor() {
        this.adapters = new Map();
        this.activeAdapterName = 'SIMULATED'; // Default
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
