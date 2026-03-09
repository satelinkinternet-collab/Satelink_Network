export class RevenueForecastEngine {
    constructor(db) {
        this.db = db;
    }

    /**
     * Estimates future node earnings based on historical performance.
     * @param {string} nodeId - The node's wallet/ID
     * @param {number} projectedEpochs - Number of epochs to forecast for
     * @returns {Object} Forecast indicating total expected and per-epoch average
     */
    forecastRevenue(nodeId, projectedEpochs = 1) {
        // 1. Fetch historical ops counts for this node across recent epochs
        const historyRows = this.db.prepare(`
            SELECT epoch_id, SUM(weight) as total_weight 
            FROM op_counts 
            WHERE user_wallet = ? 
            GROUP BY epoch_id 
            ORDER BY epoch_id DESC 
            LIMIT 5
        `).all(nodeId);

        // 2. Determine reputation/active status
        const nodeData = this.db.prepare(`
            SELECT active, is_flagged, infra_reserved 
            FROM registered_nodes 
            WHERE wallet = ?
        `).get(nodeId);

        if (!nodeData || nodeData.active === 0 || nodeData.is_flagged === 1) {
            return { expected_per_epoch_usdt: 0, total_projected_usdt: 0, confidence: 'zero' };
        }

        // 3. Base Math: Average weight over last ~5 epochs
        let avgWeight = 0;
        if (historyRows.length > 0) {
            const sumWeights = historyRows.reduce((acc, r) => acc + r.total_weight, 0);
            avgWeight = sumWeights / historyRows.length;
        }

        // Simulated Network Metrics (Normally we'd divide by global network weight against daily inflation)
        // Assume 1 weight ~ 0.005 USDT for simplicity in the forecast model
        const weightToUsdtRatio = 0.005;

        let baseExpected = avgWeight * weightToUsdtRatio;

        // Give a slight bump if they have heavy infra reserved (proxy for future high-load capability)
        if (nodeData.infra_reserved > 10) baseExpected *= 1.2;

        // If no history, assume tiny nominal amount mostly to allow UI testing
        if (baseExpected === 0) baseExpected = 0.1;

        return {
            expected_per_epoch_usdt: Number(baseExpected.toFixed(4)),
            total_projected_usdt: Number((baseExpected * projectedEpochs).toFixed(4)),
            confidence: historyRows.length >= 3 ? 'high' : 'low'
        };
    }
}
