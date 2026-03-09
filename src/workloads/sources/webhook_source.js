/**
 * Webhook Source Connector
 *
 * Discovers webhook delivery workloads from integration endpoints.
 *
 * These represent outbound webhook calls that external systems have
 * registered with Satelink — the delivery itself is the workload.
 *
 * In simulation mode, synthetic webhook delivery requests are generated.
 */

const WEBHOOK_TARGETS = [
    'https://hooks.example.com/deploy',
    'https://api.partner.io/events',
    'https://integrations.saas.dev/webhook'
];
const DEFAULT_REWARD = 0.0003;

export class WebhookConnector {
    constructor(opts = {}) {
        this.name = 'webhook';
        this.enabled = true;
        this._counters = { discovered: 0, accepted: 0, rejected: 0 };
    }

    /**
     * Discover pending webhook delivery workloads.
     *
     * @returns {Array<{ op_type, target, payload, reward, source }>}
     */
    async discover() {
        if (!this.enabled) return [];

        const workloads = [];
        const count = Math.floor(Math.random() * 3);  // 0-2 per cycle
        for (let i = 0; i < count; i++) {
            const url = WEBHOOK_TARGETS[Math.floor(Math.random() * WEBHOOK_TARGETS.length)];
            workloads.push({
                op_type: 'webhook_delivery',
                target: url,
                payload: {
                    url,
                    body: { event: 'trigger', ts: Date.now() },
                    retry_policy: { max_retries: 3, delay_ms: 1000 }
                },
                reward: DEFAULT_REWARD,
                source: 'webhook',
                _discovered_at: Date.now()
            });
        }
        this._counters.discovered += workloads.length;
        return workloads;
    }

    stats() {
        return { source: this.name, enabled: this.enabled, ...this._counters };
    }
}
