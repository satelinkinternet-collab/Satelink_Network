/**
 * Webhook Adapter
 *
 * Converts inbound webhook payloads (Github, Stripe, generic HTTP POST triggers)
 * into the normalised internal workload format:
 *   { op_type, target, payload, reward }
 *
 * Sources: external service webhook relays, automation platforms (Zapier, Make, n8n)
 */

export class WebhookAdapter {
    static DEFAULT_REWARD = 0.001;
    static MAX_PAYLOAD_BYTES = 10240;   // 10 KB — matches ops_api.js limit

    /**
     * @param {Object} raw
     * @param {string} raw.event           - event type (e.g. 'push', 'payment.succeeded')
     * @param {Object} raw.data            - event body
     * @param {string} [raw.source]        - originating service name
     * @param {string} [raw.target]        - forwarding target (URL or service key)
     * @param {number} [raw.reward]
     * @returns {{ op_type, target, payload, reward }}
     */
    normalise(raw) {
        const { event, data, source = 'unknown', target = 'webhook_relay', reward } = raw;

        if (!event) throw new Error('[WebhookAdapter] event is required');
        if (!data || typeof data !== 'object') throw new Error('[WebhookAdapter] data must be an object');

        // Payload size guard
        const serialised = JSON.stringify(data);
        if (Buffer.byteLength(serialised, 'utf8') > WebhookAdapter.MAX_PAYLOAD_BYTES) {
            throw new Error('[WebhookAdapter] payload exceeds 10 KB limit');
        }

        return {
            op_type: 'webhook_delivery',
            target,
            payload: { event, data, source },
            reward: reward ?? WebhookAdapter.DEFAULT_REWARD
        };
    }

    canHandle(raw) {
        return raw && typeof raw.event === 'string' && raw.data !== undefined;
    }
}
