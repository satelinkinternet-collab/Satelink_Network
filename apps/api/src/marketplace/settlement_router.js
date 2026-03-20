/**
 * Settlement Router
 *
 * Logic for cross-node revenue distribution.
 *
 * Revenue is recorded exclusively through OperationsEngine.executeOp().
 * Earnings are created only when finalizeEpoch() runs — never directly inserted.
 */
import { logger } from '../monitoring/logger.js';

export class SettlementRouter {
    constructor(opsEngine) {
        this.opsEngine = opsEngine;
        this.db = opsEngine.db;
    }

    /**
     * Report execution and record revenue through canonical pipeline.
     *
     * Revenue flow:
     *   executeOp() → revenue_events_v2 → finalizeEpoch() → epoch_earnings
     *
     * The 20/80 finder-fee / executor split is handled by the epoch engine
     * when it distributes the node pool based on uptime and contribution.
     * We record two executeOp() calls so that both the origin and executor
     * nodes have verifiable revenue events for the epoch.
     */
    async reportExecution(executionData) {
        const { workload_id, origin_node, executor_node, price, status } = executionData;

        if (status !== 'SUCCESS') {
            await this._updateJobStatus(workload_id, 'FAILED');
            return { ok: false, status: 'FAILED' };
        }

        // Split: 20% to Origin Node (finder's fee), 80% to Executor Node
        const originShare = price * 0.2;
        const executorShare = price * 0.8;

        try {
            // 1. Record origin node's finder-fee revenue via canonical pipeline
            await this.opsEngine.executeOp({
                op_type: 'marketplace_settlement',
                client_id: origin_node,
                request_id: `market_origin_${workload_id}`,
                node_id: origin_node,
            });

            // 2. Record executor node's execution revenue via canonical pipeline
            await this.opsEngine.executeOp({
                op_type: 'marketplace_settlement',
                client_id: origin_node,
                request_id: `market_exec_${workload_id}`,
                node_id: executor_node,
            });

            // Earnings will be created by finalizeEpoch() based on these
            // revenue_events_v2 entries and each node's uptime ratio.

            // 3. Update job status
            await this._updateJobStatus(workload_id, 'COMPLETED');

            // 4. Update metrics
            await this.db.query(`
                INSERT INTO connector_metrics (connector_name, jobs_processed, revenue_generated, updated_at)
                VALUES ('marketplace_inbound', 1, ?, ?)
                ON CONFLICT(connector_name) DO UPDATE SET
                    jobs_processed = connector_metrics.jobs_processed + 1,
                    revenue_generated = connector_metrics.revenue_generated + EXCLUDED.revenue_generated,
                    updated_at = EXCLUDED.updated_at
            `, [price, Date.now()]);

            logger.info({ workload_id, price, origin_node, executor_node }, '[MARKETPLACE] Execution reported via canonical pipeline');

            return { ok: true, settlement: { originShare, executorShare } };
        } catch (e) {
            logger.error({ error: e.message, workload_id }, '[MARKETPLACE] Settlement failed');
            return { ok: false, error: e.message };
        }
    }

    async _updateJobStatus(workload_id, status) {
        try {
            await this.db.query(`UPDATE marketplace_jobs SET status = ? WHERE job_id = ?`, [status, workload_id]);
        } catch (e) {}
    }
}
