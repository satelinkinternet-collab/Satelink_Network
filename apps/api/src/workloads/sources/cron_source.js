/**
 * Cron Source Connector
 *
 * Discovers scheduled / periodic workloads (scraping tasks, data sync,
 * health pings, external API polling).
 *
 * In production, this connector reads a persisted schedule table.
 * In simulation mode it generates synthetic automation jobs.
 */

const CRON_JOB_TYPES = [
    { job: 'price_feed_sync', target: 'coingecko', interval: 60_000 },
    { job: 'node_health_poll', target: 'node_cluster', interval: 30_000 },
    { job: 'log_rotation', target: 'ops_log', interval: 300_000 },
    { job: 'api_scraper', target: 'external_api', interval: 120_000 }
];
const DEFAULT_REWARD = 0.0001;

export class CronConnector {
    constructor(opts = {}) {
        this.name = 'cron';
        this.enabled = true;
        this._counters = { discovered: 0, accepted: 0, rejected: 0 };
        this._lastFired = new Map();  // job → last fire timestamp
    }

    /**
     * Discover cron-triggered workloads whose intervals have elapsed.
     *
     * @returns {Array<{ op_type, target, payload, reward, source }>}
     */
    async discover() {
        if (!this.enabled) return [];

        const now = Date.now();
        const workloads = [];

        for (const spec of CRON_JOB_TYPES) {
            const last = this._lastFired.get(spec.job) || 0;
            if (now - last >= spec.interval) {
                this._lastFired.set(spec.job, now);
                workloads.push({
                    op_type: 'automation_job',
                    target: spec.target,
                    payload: {
                        job_type: spec.job,
                        schedule: `every_${spec.interval / 1000}s`,
                        context: { triggered_at: now }
                    },
                    reward: DEFAULT_REWARD,
                    source: 'cron',
                    _discovered_at: now
                });
            }
        }
        this._counters.discovered += workloads.length;
        return workloads;
    }

    stats() {
        return { source: this.name, enabled: this.enabled, ...this._counters };
    }
}
