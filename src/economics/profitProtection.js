import { calculateMargin } from './marginCalculator.js';
import { PricingGuard } from './pricingGuard.js';
import { DynamicProfitGuard } from './dynamic_profit_guard.js';
import { logger } from '../monitoring/logger.js';
import client from 'prom-client';

// Prometheus Metrics
const profitMarginAverage = new client.Gauge({ name: 'profit_margin_average', help: 'Average profit margin across executed jobs' });
const jobsRejectedLowMargin = new client.Counter({ name: 'jobs_rejected_low_margin', help: 'Total jobs rejected due to low profit margin' });
const profitTotal = new client.Counter({ name: 'profit_total_usdt', help: 'Total platform profit in USDT' });

// NEW Dynamic Metrics
const profitMarginCurrent = new client.Gauge({ name: 'profit_margin_current', help: 'Profit margin of the most recent evaluated job' });
const profitMarginThreshold = new client.Gauge({ name: 'profit_margin_threshold', help: 'Current required minimum profit margin threshold' });
const jobsRejectedProfitGuard = new client.Counter({ name: 'jobs_rejected_profit_guard', help: 'Total jobs rejected by the dynamic profit guard' });

let totalMarginSum = 0;
let totalExecutedJobs = 0;

export class ProfitProtection {
    constructor(db) {
        this.guard = new PricingGuard(30);
        this.dynamicGuard = db ? new DynamicProfitGuard(db) : null;
    }

    /**
     * Evaluates a workload before execution to ensure profitability.
     * 
     * @param {Object} workload - The job/workload object
     * @param {number} userPrice - Price paid by the user
     * @param {number} nodeReward - Reward offered to the community node
     * @param {Object} networkStats - Real-time network state
     * @param {number} providerCost - Cost if routed to an external provider
     * @returns {Object} 
     */
    evaluateWorkload(workload, userPrice, nodeReward, networkStats = {}, providerCost = 0) {
        const totalCost = nodeReward + providerCost;
        const result = calculateMargin(userPrice, totalCost);

        // 1. Determine Dynamic Threshold
        const threshold = this.dynamicGuard
            ? this.dynamicGuard.calculateTargetMargin(networkStats)
            : 30; // Fallback to 30% if no dynamic guard

        profitMarginThreshold.set(threshold);
        profitMarginCurrent.set(result.margin_percentage);

        // 2. Validate Pricing
        const validation = this.guard.validatePricing(userPrice, totalCost, threshold);

        if (validation.status === 'reject') {
            // Attempt dynamic adjustment (10% reward reduction)
            const adjustedNodeReward = nodeReward * 0.9;
            const adjustedCost = adjustedNodeReward + providerCost;
            const adjustedResult = calculateMargin(userPrice, adjustedCost);
            const adjustedValidation = this.guard.validatePricing(userPrice, adjustedCost, threshold);

            if (adjustedValidation.status === 'ok') {
                logger.info({
                    job_id: workload.id,
                    old_margin: result.margin_percentage,
                    new_margin: adjustedResult.margin_percentage,
                    threshold
                }, 'profit_guard_adjust');

                this._recordSuccess(adjustedResult);
                return {
                    allowed_execution: true,
                    adjusted_node_reward: parseFloat(adjustedNodeReward.toFixed(6)),
                    expected_profit: adjustedResult.profit
                };
            }

            logger.warn({
                job_id: workload.id,
                revenue: userPrice,
                cost: totalCost,
                margin: result.margin_percentage,
                threshold
            }, 'profit_guard_reject');

            jobsRejectedLowMargin.inc();
            jobsRejectedProfitGuard.inc();
            return {
                allowed_execution: false,
                adjusted_node_reward: nodeReward,
                expected_profit: result.profit
            };
        }

        logger.info({ job_id: workload.id, margin: result.margin_percentage, threshold }, 'profit_guard_pass');
        this._recordSuccess(result);

        return {
            allowed_execution: true,
            adjusted_node_reward: nodeReward,
            expected_profit: result.profit
        };
    }

    _recordSuccess(result) {
        totalMarginSum += result.margin_percentage;
        totalExecutedJobs++;
        profitMarginAverage.set(totalMarginSum / totalExecutedJobs);
        profitTotal.inc(result.profit);
    }
}
