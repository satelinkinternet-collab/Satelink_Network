import { logger } from '../monitoring/logger.js';

/**
 * DynamicProfitGuard determines the required minimum profit margin
 * based on the real-time state of the Satelink network.
 */
export class DynamicProfitGuard {
    constructor(db) {
        this.db = db;
        this.config = {
            enabled: true,
            defaultMargin: 25,
            launchModeMargin: 40,
            highDemandThreshold: 1000000, // 1M jobs
            highDemandMargin: 15,
            lowUtilizationThreshold: 30, // 30%
            lowUtilizationMargin: 35
        };
        this._loadConfig();
    }

    /**
     * Refreshes the local config from the database.
     */
    async _loadConfig() {
        try {
            const rows = await this.db.prepare("SELECT key, value FROM system_config WHERE key LIKE '%profit_margin%' OR key = 'dynamic_profit_guard_enabled' OR key = 'launch_mode'").all();
            for (const row of rows) {
                if (row.key === 'dynamic_profit_guard_enabled') this.config.enabled = row.value === '1';
                if (row.key === 'default_profit_margin') this.config.defaultMargin = parseFloat(row.value);
                if (row.key === 'launch_mode_profit_margin') this.config.launchModeMargin = parseFloat(row.value);
                if (row.key === 'launch_mode') this.config.launchMode = row.value === '1';
            }
        } catch (error) {
            logger.warn({ error: error.message }, 'Failed to load DynamicProfitGuard config from DB, using defaults');
        }
    }

    /**
     * Calculates the target minimum margin percentage based on network statistics.
     * 
     * @param {Object} stats
     * @param {number} stats.queueLength - Local or global queue depth
     * @param {number} stats.nodeUtilization - 0-100 percentage
     * @param {boolean} stats.isLaunchMode - Override for launch conditions
     * @returns {number} Minimum margin percentage
     */
    calculateTargetMargin({ queueLength = 0, nodeUtilization = 100, isLaunchMode = false }) {
        if (!this.config.enabled) return 0;

        // 1. High Demand / Congestion Mode
        // Priority: Throughput over Margin. Lower threshold to clear backlog.
        if (queueLength > this.config.highDemandThreshold) {
            return this.config.highDemandMargin; // 15%
        }

        // 2. Launch Mode Override
        // Priority: Sustainability and High-Value capture.
        if (isLaunchMode || this.config.launchMode) {
            return this.config.launchModeMargin; // 40%
        }

        // 3. Low Utilization Mode
        // Priority: High-margin jobs while capacity is under-utilized.
        if (nodeUtilization < this.config.lowUtilizationThreshold) {
            return this.config.lowUtilizationMargin; // 35%
        }

        // 4. Normal Mode
        return this.config.defaultMargin; // 25%
    }
}
