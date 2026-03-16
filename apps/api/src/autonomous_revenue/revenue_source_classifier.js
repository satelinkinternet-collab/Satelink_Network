/**
 * Revenue Source Classifier
 * Classifies every revenue event and updates telemetry.
 *
 * All revenue events are routed through the canonical OperationsEngine.executeOp()
 * pipeline to enforce pricing, rate limits, and ledger validation.
 */
export class RevenueSourceClassifier {
    constructor(db, opsEngine) {
        this.db = db;
        this.opsEngine = opsEngine;
    }

    /**
     * Map source_type to the corresponding canonical op_type for executeOp().
     */
    _mapSourceToOpType(source_type) {
        const mapping = {
            machine_generated:   'autonomous_revenue',
            protocol_generated:  'protocol_revenue',
            human_generated:     'api_relay_execution',
        };
        return mapping[source_type] || 'api_relay_execution';
    }

    /**
     * Records a revenue event with classification.
     * Routes through executeOp() so that pricing, rate limits, surge pricing,
     * and ledger validation are enforced — never writes directly to revenue_events_v2.
     *
     * @param {object} event - { amount, token, source_type, source_id, reference_id }
     */
    async recordEvent({ amount, token = 'USDT', source_type, source_id = 'unknown', reference_id = null }) {
        const validSources = ['machine_generated', 'protocol_generated', 'human_generated'];
        const type = validSources.includes(source_type) ? source_type : 'human_generated';

        try {
            const op_type = this._mapSourceToOpType(type);

            await this.opsEngine.executeOp({
                op_type,
                client_id:  source_id,
                node_id:    source_id,
                request_id: reference_id || `rev_${type}_${Date.now()}`,
            });

            console.log(`[REVENUE-CLASSIFIER] Recorded ${amount} ${token} as ${type} via executeOp(${op_type})`);
        } catch (error) {
            console.error('[REVENUE-CLASSIFIER] Error recording event:', error.message);
        }
    }

    /**
     * Get revenue breakdown by source type
     */
    async getBreakdown() {
        try {
            const rows = await this.db.query(`
                SELECT source_type, SUM(amount) as total
                FROM revenue_events_v2
                GROUP BY source_type
            `);

            const stats = {
                machine_generated: 0,
                protocol_generated: 0,
                human_generated: 0,
                total: 0
            };

            rows.forEach(row => {
                stats[row.source_type] = row.total || 0;
                stats.total += row.total || 0;
            });

            // Calculate percentages
            const breakdown = {
                machine_revenue_percentage: stats.total > 0 ? (stats.machine_generated / stats.total) * 100 : 0,
                protocol_revenue_percentage: stats.total > 0 ? (stats.protocol_generated / stats.total) * 100 : 0,
                human_revenue_percentage: stats.total > 0 ? (stats.human_generated / stats.total) * 100 : 0,
                raw_totals: stats
            };

            return breakdown;
        } catch (error) {
            console.error('[REVENUE-CLASSIFIER] Error getting breakdown:', error.message);
            return null;
        }
    }
}
