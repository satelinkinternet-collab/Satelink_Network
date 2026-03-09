import { WORKLOAD_COSTS } from '../core/config/workload_costs.js';

export class ProfitabilityEngine {
    constructor() { }

    /**
     * Estimates the base compute cost for a given job type.
     */
    estimateComputeCost(jobType) {
        return WORKLOAD_COSTS[jobType] || 0.0001; // fallback default cost
    }

    /**
     * Calculates the expected revenue based on dynamic pricing.
     * We pass the pricing multiplier to compute final reward.
     */
    calculateExpectedRevenue(baseReward, pricingMultiplier = 1.0) {
        return baseReward * pricingMultiplier;
    }

    /**
     * Determines if a job is profitable to execute.
     */
    evaluateProfitability(job, pricingMultiplier = 1.0) {
        const cost = this.estimateComputeCost(job.type);
        const expectedRevenue = this.calculateExpectedRevenue(job.reward, pricingMultiplier);

        const profit = expectedRevenue - cost;
        const isProfitable = profit > 0;

        return {
            isProfitable,
            expectedRevenue,
            estimatedCost: cost,
            projectedProfit: profit
        };
    }

    /**
     * Approves or rejects a job cleanly based on profitability boolean.
     */
    approve(job, pricingMultiplier = 1.0) {
        return this.evaluateProfitability(job, pricingMultiplier).isProfitable;
    }
}
