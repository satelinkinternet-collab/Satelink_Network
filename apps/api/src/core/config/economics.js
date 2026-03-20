/**
 * economics.js — Single source of truth for Satelink revenue economics.
 *
 * All revenue split calculations MUST import from this file.
 * No inline 0.50/0.30/0.20 constants elsewhere in the codebase.
 */

export const REVENUE_SPLIT = {
    node: 0.50,       // 50% to node operators
    platform: 0.30,   // 30% to platform
    treasury: 0.20    // 20% to distribution/treasury pool
};

// Surge pricing cap — prevents runaway pricing from malformed surge rules
export const MAX_SURGE_MULTIPLIER = 3.0;

// Minimum profit margin floor (5% above node cost)
export const PROFIT_MARGIN_FLOOR = 0.05;

// Minimum payout threshold in USDT
export const MIN_PAYOUT_USDT = 1.0;

/**
 * Apply revenue split to a total amount.
 * @param {number} totalRevenue - Total revenue in USDT
 * @returns {{ nodePool: number, platformFee: number, distributionPool: number }}
 */
export function applySplit(totalRevenue) {
    return {
        nodePool: totalRevenue * REVENUE_SPLIT.node,
        platformFee: totalRevenue * REVENUE_SPLIT.platform,
        distributionPool: totalRevenue * REVENUE_SPLIT.treasury
    };
}

/**
 * Cap surge multiplier to MAX_SURGE_MULTIPLIER.
 * @param {number} surge - Raw surge multiplier
 * @returns {number} Capped surge multiplier
 */
export function capSurge(surge) {
    return Math.min(surge, MAX_SURGE_MULTIPLIER);
}
