export class OpsExecutionAdapter {
    constructor(db, jobQueue) {
        this.db = db;
        this.jobQueue = jobQueue;
    }

    /**
     * Bridges the Universal API into the legacy pipeline mapping 1:1 against JobQueue format.
     * The JobScheduler will naturally intercept these payloads assuming they act identically
     * to native Workload Discovery tasks.
     * @param {Object} opData
     */
    async dispatchOperation(opData) {
        console.log(`[OpsExecutionAdapter] Mapping abstract OP ${opData.id} into primary execution routing pipeline.`);

        const internalJob = {
            id: opData.id,
            type: opData.type,
            chain: opData.target === 'generic' ? null : opData.target,  // Execution Router parses 'chain' natively
            reward: opData.reward,
            payload: opData.payload,
            priority: 'developer', // High relative queuing bound
            client_id: opData.client_id,
            is_universal_op: true
        };

        // Pass to standard Queue -> Profitability Matrix -> Scheduler -> Nodal routing
        await this.jobQueue.push_job(internalJob);
    }
}
