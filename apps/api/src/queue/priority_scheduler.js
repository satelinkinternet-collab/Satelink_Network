/**
 * PriorityScheduler decides which node gets the job based on priority levels and node health.
 */
export class PriorityScheduler {
    constructor(capacityManager) {
        this.capacityManager = capacityManager;
    }

    /**
     * Selects the optimal node for a given job, potentially considering retry rules.
     * @param {Object} job - The job metadata
     * @param {Object} [retryInfo] - { attempts: number, lastNode: string }
     * @returns {Object|null} Selected node or null if no capacity
     */
    async selectNode(job, retryInfo = null) {
        const availableNodes = await this.capacityManager.getAvailableNodes();

        if (availableNodes.length === 0) return null;

        // Requirement-based Retry Selection:
        if (retryInfo) {
            // 1st retry -> same node (if still has capacity)
            if (retryInfo.attempts === 1) {
                const sameNode = availableNodes.find(n => n.node_id === retryInfo.lastNode);
                if (sameNode) return sameNode;
            }

            // 2nd retry -> different node
            if (retryInfo.attempts === 2) {
                const differentNodes = availableNodes.filter(n => n.node_id !== retryInfo.lastNode);
                if (differentNodes.length > 0) return differentNodes[0]; // best of the different ones
            }

            // 3rd retry -> highest reputation node (already sorted by reputation, so first in list)
            if (retryInfo.attempts === 3) {
                return availableNodes[0];
            }
        }

        // Default Priority-based selection
        if (job.priority === 'HIGH') {
            return availableNodes[0];
        }

        if (job.priority === 'NORMAL') {
            const poolSize = Math.min(3, availableNodes.length);
            return availableNodes[Math.floor(Math.random() * poolSize)];
        }

        return availableNodes[Math.floor(Math.random() * availableNodes.length)];
    }
}
