/**
 * Calculates profit and margin percentage based on revenue and cost.
 * 
 * @param {number} revenue - Total user payment or expected income
 * @param {number} cost - Total execution cost (node reward + provider fees)
 * @returns {Object} { profit, margin_percentage }
 */
export function calculateMargin(revenue, cost) {
    const profit = revenue - cost;
    const margin_percentage = revenue > 0 ? (profit / revenue) * 100 : 0;

    return {
        profit: parseFloat(profit.toFixed(6)),
        margin_percentage: parseFloat(margin_percentage.toFixed(2))
    };
}
