/**
 * Enforces minimum profit margins for the Satelink network.
 */
export class PricingGuard {
    constructor(minMargin = 30) {
        this.minMargin = minMargin;
    }

    /**
     * Validates if the given revenue and cost meet the minimum margin threshold.
     * 
     * @param {number} revenue 
     * @param {number} cost 
     * @param {number} [threshold] - Optional dynamic threshold override
     * @returns {Object} { status: "ok" | "reject", margin: number }
     */
    validatePricing(revenue, cost, threshold) {
        if (process.env.DISABLE_PROFIT_GUARD === "true") {
            return true;
        }
        const profit = revenue - cost;
        const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
        const target = threshold !== undefined ? threshold : this.minMargin;

        if (margin < target) {
            return { status: "reject", margin: parseFloat(margin.toFixed(2)) };
        }

        return { status: "ok", margin: parseFloat(margin.toFixed(2)) };
    }
}
