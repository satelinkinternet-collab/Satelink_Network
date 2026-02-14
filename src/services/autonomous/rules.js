/**
 * Phase N1: Autonomous Rules Logic
 * Pure functions that return recommendation objects or null.
 */

export const Rules = {
    /**
     * R1: Reward Protection
     * @param {Object} metrics { burnRate, totalRevenue, stabilityScore }
     * @param {Object} config { burnThresholdPct } 
     */
    checkRewardProtection(metrics, config) {
        const { burnRate, totalRevenue, stabilityScore } = metrics;
        const burnThresholdPct = parseInt(config.burn_threshold_pct || '20'); // Default tight 20%

        const currentBurnPct = totalRevenue > 0 ? (burnRate / totalRevenue) * 100 : 100;

        // Condition 1: High Burn
        if (currentBurnPct > burnThresholdPct) {
            return {
                type: 'reward_adjust',
                entity_type: 'system',
                entity_id: 'GLOBAL',
                priority: 'high',
                reason: `Burn rate (${currentBurnPct.toFixed(1)}%) exceeds threshold (${burnThresholdPct}%)`,
                action: 'reduce_multiplier',
                value: 10 // step pct
            };
        }

        // Condition 2: Low Stability
        if (stabilityScore < 50) {
            return {
                type: 'reward_adjust',
                entity_type: 'system',
                entity_id: 'GLOBAL',
                priority: 'critical',
                reason: `Stability score low (${stabilityScore})`,
                action: 'reduce_multiplier',
                value: 10
            };
        }

        return null;
    },

    /**
     * R2: Region Cap Suggestion
     * @param {Object} regionData { region_code, avgOpsPerNode, p95Latency }
     * @param {Object} config 
     */
    checkRegionCap(regionData, config) {
        const { region_code, avgOpsPerNode, p95Latency } = regionData;

        // High Load -> Increase Cap
        // Thresholds could be config, hardcoded for now as per spec N1
        if (avgOpsPerNode > 1000 && p95Latency > 200) {
            return {
                type: 'region_cap',
                entity_type: 'region',
                entity_id: region_code,
                priority: 'medium',
                reason: `High load (${Math.round(avgOpsPerNode)} ops/node) & Latency (${Math.round(p95Latency)}ms)`,
                action: 'increase_cap',
                value: 5 // +5 nodes
            };
        }

        // Low Load -> Decrease Cap / Pause
        if (avgOpsPerNode < 50) {
            return {
                type: 'region_cap',
                entity_type: 'region',
                entity_id: region_code,
                priority: 'low',
                reason: `Underutilized (${Math.round(avgOpsPerNode)} ops/node)`,
                action: 'decrease_cap', // or 'status_review'
                value: 5
            };
        }

        return null;
    },

    /**
     * R4: Node Bonus Suggestion
     * @param {Object} nodeData { node_id, composite_score, uptime }
     */
    checkNodeBonus(nodeData) {
        if (nodeData.composite_score > 90 && nodeData.uptime > 99) {
            return {
                type: 'node_bonus',
                entity_type: 'node',
                entity_id: nodeData.node_id,
                priority: 'low',
                reason: `Top Tier Performance (Score: ${nodeData.composite_score})`,
                action: 'grant_bonus',
                multiplier: 1.05,
                duration_hours: 24
            };
        }
        return null;
    },

    /**
     * R5: Churn Prevention
     * @param {Object} nodeEcon { node_id, negative_streak_days }
     */
    checkChurnRisk(nodeEcon) {
        if (nodeEcon.negative_streak_days >= 3) {
            return {
                type: 'churn_prevent',
                entity_type: 'node',
                entity_id: nodeEcon.node_id,
                priority: 'high',
                reason: `Negative margin streak (${nodeEcon.negative_streak_days} days)`,
                action: 'flag_risk',
                suggested_bonus: 1.02
            };
        }
        return null;
    }
};
