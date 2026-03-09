export class TaskGenerator {
    constructor() { }

    /**
     * Converts a raw detected workload from MarketScanner into a normalized Satelink Job
     */
    generateJob(detectedWorkload) {
        return {
            type: detectedWorkload.job_type,
            chain: detectedWorkload.chain || 'agnostic',
            reward: detectedWorkload.reward_usdt,
            payload: detectedWorkload.payload,
            priority: this._determinePriority(detectedWorkload.reward_usdt),
            source: detectedWorkload.source,
            client_id: `market_${detectedWorkload.source}`
        };
    }

    /**
     * Simplistic heuristic to slot higher paying tasks into enterprise queues
     */
    _determinePriority(reward) {
        if (reward >= 0.005) return 'enterprise';
        if (reward >= 0.001) return 'developer';
        return 'free';
    }
}
