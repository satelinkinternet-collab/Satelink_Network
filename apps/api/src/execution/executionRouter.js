import { logger } from '../monitoring/logger.js';
import { CapacityManager } from './capacityManager.js';
import { ProviderFallback } from './providerFallback.js';
import { ProfitProtection } from '../economics/profitProtection.js';
import { JobQueue } from '../queue/job_queue.js';
import client from 'prom-client';

// Prometheus Metrics
const executionGenesisTotal = new client.Counter({ name: 'execution_genesis_total', help: 'Total jobs executed by Genesis nodes' });
const executionCommunityTotal = new client.Counter({ name: 'execution_community_total', help: 'Total jobs executed by Community nodes' });
const executionProviderTotal = new client.Counter({ name: 'execution_provider_total', help: 'Total jobs executed by External providers' });

export class ExecutionRouter {
    constructor(db) {
        this.db = db;
        this.capacityManager = new CapacityManager(db);
        this.providerFallback = new ProviderFallback();
        this.profitProtection = new ProfitProtection(db);
    }

    /**
     * Routes a workload according to priority: Genesis -> Community -> External.
     * @param {Object} job
     * @returns {Promise<Object>}
     */
    async routeExecution(job) {
        const { type, payload, reward } = job;

        // 0. Profit Protection Guard (Dynamic)
        const userPrice = reward || 0.005;
        const nodeReward = userPrice * 0.6;
        const providerCost = 0.001;

        // Calculate Network Stats
        const communityNodes = await this.capacityManager.getAvailableCommunityNodes();
        const totalNodes = (this.db.prepare("SELECT COUNT(*) as count FROM registered_nodes WHERE active = 1").get() || { count: 0 }).count;
        const utilization = totalNodes > 0 ? ((totalNodes - communityNodes.length) / totalNodes) * 100 : 0;
        const queueLength = await JobQueue.getLength();

        const networkStats = {
            queueLength,
            nodeUtilization: utilization,
            isLaunchMode: false
        };

        const valuation = this.profitProtection.evaluateWorkload(job, userPrice, nodeReward, networkStats, providerCost);

        if (!valuation.allowed_execution && process.env.DISABLE_PROFIT_GUARD !== "true") {
            throw new Error(`Execution rejected: insufficient profit margin (Required per Dynamic Guard)`);
        }

        const activeNodeReward = valuation.adjusted_node_reward;

        // 1. Try Genesis Nodes
        const genesisNodes = await this.capacityManager.getAvailableGenesisNodes();
        if (genesisNodes.length > 0) {
            const node = genesisNodes[Math.floor(Math.random() * genesisNodes.length)];
            logger.info({
                job_id: job.id,
                node_id: node.node_id,
                profit: valuation.expected_profit
            }, 'execution_genesis');
            executionGenesisTotal.inc();

            return { success: true, source: 'genesis', node_id: node.node_id, reward: activeNodeReward };
        }

        // 2. Try Community Nodes
        if (communityNodes.length > 0) {
            const node = communityNodes[0];
            logger.info({
                job_id: job.id,
                node_id: node.node_id,
                profit: valuation.expected_profit
            }, 'execution_community');
            executionCommunityTotal.inc();

            await this.capacityManager.assignWorkload(node.node_id, 'community');

            return { success: true, source: 'community', node_id: node.node_id, reward: activeNodeReward };
        }


        // 3. Fallback to External Provider
        logger.warn({ job_id: job.id }, 'execution_fallback_initiated');
        try {
            const result = await this.providerFallback.executeExternal(job);
            executionProviderTotal.inc();
            return result;
        } catch (error) {
            logger.error({ job_id: job.id, error: error.message }, 'full_execution_failure');
            throw new Error(`Execution failed at all levels: ${error.message}`);
        }
    }
}
