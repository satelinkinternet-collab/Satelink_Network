import { getOpsPrice } from '../core/config/ops_pricing.js';

export class PricingEngine {
    constructor(db) {
        this.db = db;
    }

    /**
     * Determine dynamic pricing multiplier based on network load logic.
     * We calculate load by querying the active queue depth or recent execution rate.
     */
    getDynamicMultiplier(currentLoadPercentage) {
        if (currentLoadPercentage >= 80) {
            return 1.5; // high load
        } else if (currentLoadPercentage >= 50) {
            return 1.2; // medium load
        } else {
            return 1.0; // low load
        }
    }

    /**
     * For integration with Operations Engine (if requested to override base config)
     * e.g. mapping OP_CONFIG base prices * multiplier dynamically.
     */
    getAdjustedPrice(opType, currentLoadPercentage) {
        const price = getOpsPrice(opType);
        if (!price) return 0;

        const multiplier = this.getDynamicMultiplier(currentLoadPercentage);
        return price * multiplier;
    }
}
