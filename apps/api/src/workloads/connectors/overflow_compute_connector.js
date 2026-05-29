/**
 * Overflow Compute Marketplace Connector
 * 
 * Allows external clients to submit compute workloads when their 
 * infrastructure is overloaded.
 */

const OVERFLOW_JOB_TYPES = [
    { type: 'batch_processing', target: 'batch_job', reward: 0.5 },
    { type: 'data_transformation', target: 'batch_job', reward: 0.6 },
    { type: 'analytics_pipeline', target: 'batch_job', reward: 0.8 },
    { type: 'ai_batch_inference', target: 'batch_job', reward: 1.2 },
    { type: 'large_file_processing', target: 'batch_job', reward: 0.7 }
];

export class OverflowComputeConnector {
    constructor() {
        this.name = 'overflow_market';
        this._counters = {
            discovered: 0,
            accepted: 0,
            rejected: 0
        };
        this._cycleCount = 0;
    }

    /**
     * Discover pending compute workloads.
     * Simulated discovery logic.
     * Poll cycle: every 30 seconds (skips every other cycle if engine runs at 15s).
     */
    async discover() {
        this._cycleCount++;

        // Skip every other cycle to maintain 30s polling if engine is at 15s
        if (this._cycleCount % 2 === 0) {
            return [];
        }

        const workloads = [];
        // Generate 0-1 jobs per 30s cycle
        const count = Math.random() > 0.7 ? 1 : 0;

        for (let i = 0; i < count; i++) {
            const jobInfo = OVERFLOW_JOB_TYPES[Math.floor(Math.random() * OVERFLOW_JOB_TYPES.length)];

            workloads.push({
                op_type: 'overflow_compute',
                target: jobInfo.target,
                payload: {
                    job_type: jobInfo.type,
                    dataset: `ds_${Math.random().toString(36).substring(7)}`,
                    priority: 'OVERFLOW'
                },
                reward: jobInfo.reward,
                source: this.name
            });
        }

        this._counters.discovered += workloads.length;
        return workloads;
    }

    stats() {
        return {
            source: this.name,
            ...this._counters
        };
    }
}
